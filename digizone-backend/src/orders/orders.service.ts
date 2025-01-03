import { BadRequestException, Inject, Injectable,UnauthorizedException } from '@nestjs/common';
import { OrdersRepository } from 'src/shared/repositories/order.repository';
import { ProductRepository } from 'src/shared/repositories/product.respository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { checkoutDtoArr } from './dto/checkout.dto';
import config from 'config';
import { userTypes } from 'src/shared/schema/users';
import { orderStatus, paymentStatus } from 'src/shared/schema/orders';
import { sendEmail } from 'src/shared/utility/mail-handler';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripeClient: Stripe,
    @Inject(OrdersRepository) private readonly orderDB: OrdersRepository,
    @Inject(ProductRepository) private readonly productDB: ProductRepository,
    @Inject(UserRepository) private readonly userDB: UserRepository,
  ) {}

  async create(createOrderDto: Record<string, any>) {
    try {
      const orderExists = await this.orderDB.findOne({
        checkoutSessionId: createOrderDto.checkoutSessionId,
      });
      if (orderExists) return orderExists;
      const result = await this.orderDB.create(createOrderDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async findAll(status: string, user: Record<string, any>) {
    try {
      const userId = user?._id?.toString() || new ObjectId(); // Default ObjectId if undefined
      const userDetails = await this.userDB.findOne({ _id: userId });
      
      const query = {} as Record<string, any>;
      if (userDetails?.type === userTypes.CUSTOMER) {
        query.userId = userId;
      }
      if (status) {
        query.status = status;
      }
  
      const orders = await this.orderDB.find(query);
      return {
        success: true,
        result: orders,
        message: 'Orders fetched successfully'
      };
    } catch (error) {
      throw error;
    }
  }
  async findOne(id: string) {
    try {
      const result = await this.orderDB.findOne({ _id: id });
      return {
        success: true,
        result,
        message: 'Order fetched successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async checkout(body: checkoutDtoArr, user: Record<string, any>) {
    try {
      // Validate user object
      if (!user || !user._id) {
        throw new UnauthorizedException('Invalid user information');
      }
  
      const cartItems = body.checkoutDetails;
  
      // Validate cart items
      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
  
      let lineItems = [];

      for (const item of cartItems) {
        // Use the item's _id if it exists, otherwise default to a fallback ID
        const productId = item._id; // Ensure this is the MongoDB-generated _id
        const product = await this.productDB.findOne({ _id: new ObjectId(productId) });
        
        if (!product) {
          // Redirect logic
          return {
            success: false,
            // message: `Product with ID ${productId} not found`,
            redirect: 'http://localhost:3000/order-success', // Example redirect URL
          };
        }
         
        // Use the product's _id in the lineItems
        lineItems.push({
          productId: product._id,
          quantity: item.quantity > 0 ? item.quantity : 1, // Default quantity to 1 if invalid
        });
      }
      
      // Proceed with the checkout process using the valid lineItems
      if (lineItems.length === 0) {
        throw new BadRequestException('No valid items in cart to process');
      }
      
      console.log('Processed line items:', lineItems);

// Proceed with `lineItems` for checkout logic
if (lineItems.length === 0) {
  throw new BadRequestException('No items in cart to process');
}

// Example: Proceed with order creation or validation
console.log('Processed line items:', lineItems);

for (const item of cartItems) {
  // Find the product using productId
  const product = await this.productDB.findOne({ _id: item._id });

  if (!product) {
    throw new BadRequestException(`Product with ID ${item._id} not found`);
  }

  // Get the first available SKU for the product 
  const sku = product.skuDetails[0]; // Assuming you want to use the first SKU 
  if (!sku) {
    throw new BadRequestException(`Product with ID ${item._id} has no SKUs`);
  }

  lineItems.push({
    price: sku._id, 
    quantity: item.quantity,
  });
}
  
      // Create order object without Stripe integration
      const orderData = {
        orderId: Math.floor(new Date().valueOf() * Math.random()) + '',
        userId: user._id.toString(),
        // ... other order details (customerAddress, customerEmail, etc.)
        orderedItems: lineItems.map((item) => ({ 
          productId: item.price.metadata.productId, // Extract productId from price metadata
          quantity: item.quantity,
          price: item.price.unit_amount / 100, 
        })),
        orderStatus: 'pending', 
        // ... other order fields
      };
  
      // Save the order to the database
      const order = await this.create(orderData);
  
      // Send order confirmation email (optional)
      // await this.sendOrderEmail(orderData.customerEmail, orderData.orderId);
  
      return {
        message: 'Order placed successfully',
        success: true,
        result: order._id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Checkout failed: ' + error.message);
    }
  }

  async webhook(rawBody: Buffer, sig: string) {
    try {
      let event;
      try {
        event = this.stripeClient.webhooks.constructEvent(
          rawBody,
          sig,
          config.get('stripe.webhookSecret'),
        );
      } catch (err) {
        throw new BadRequestException('Webhook Error:', err.message);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderData = await this.createOrderObject(session);
        const order = await this.create(orderData);
        if (session.payment_status === paymentStatus.paid) {
          if (order.orderStatus !== orderStatus.completed) {
            for (const item of order.orderedItems) {
              const licenses = await this.getLicense(orderData.orderId, item);
              item.licenses = licenses;
            }
          }
          await this.fullfillOrder(session.id, {
            orderStatus: orderStatus.completed,
            isOrderDelivered: true,
            ...orderData,
          });
          this.sendOrderEmail(
            orderData.customerEmail,
            orderData.orderId,
            `${config.get('emailService.emailTemplates.orderSuccess')}${
              order._id
            }`,
          );
        }
      } else {
        console.log('Unhandled event type', event.type);
      }
    } catch (error) {
      throw error;
    }
  }

  async fullfillOrder(
    checkoutSessionId: string,
    updateOrderDto: Record<string, any>,
  ) {
    try {
      return await this.orderDB.findOneAndUpdate(
        { checkoutSessionId },
        updateOrderDto,
        { new: true },
      );
    } catch (error) {
      throw error;
    }
  }

  async sendOrderEmail(email: string, orderId: string, orderLink: string) {
    await sendEmail(
      email,
      config.get('emailService.emailTemplates.orderSuccess'),
      'Order Success - Digizone',
      {
        orderId,
        orderLink,
      },
    );
  }

  async getLicense(orderId: string, item: Record<string, any>) {
    try {
      const product = await this.productDB.findOne({
        _id: item.productId,
      });

      const skuDetails = product.skuDetails.find(
        (sku) => sku.skuCode === item.skuCode,
      );

      const licenses = await this.productDB.findLicense(
        {
          productSku: skuDetails._id,
          isSold: false,
        },
        item.quantity,
      );

      const licenseIds = licenses.map((license) => license._id);

      await this.productDB.updateLicenseMany(
        {
          _id: {
            $in: licenseIds,
          },
        },
        {
          isSold: true,
          orderId,
        },
      );

      return licenses.map((license) => license.licenseKey);
    } catch (error) {
      throw error;
    }
  }

  async createOrderObject(session: Stripe.Checkout.Session) {
    try {
      const lineItems = await this.stripeClient.checkout.sessions.listLineItems(
        session.id,
      );
      const orderData = {
        orderId: Math.floor(new Date().valueOf() * Math.random()) + '',
        userId: session.metadata?.userId?.toString(),
        customerAddress: session.customer_details?.address,
        customerEmail: session.customer_email,
        customerPhoneNumber: session.customer_details?.phone,
        paymentInfo: {
          paymentMethod: session.payment_method_types[0],
          paymentIntentId: session.payment_intent,
          paymentDate: new Date(),
          paymentAmount: session.amount_total / 100,
          paymentStatus: session.payment_status,
        },
        orderDate: new Date(),
        checkoutSessionId: session.id,
        orderedItems: lineItems.data.map((item) => {
          item.price.metadata.quantity = item.quantity + '';
          return item.price.metadata;
        }),
      };
      return orderData;
    } catch (error) {
      throw error;
    }
  }
}