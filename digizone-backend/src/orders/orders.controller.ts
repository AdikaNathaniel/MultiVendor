import { Controller, Get, Post, Body, Param, Headers, Req, Query, UseGuards, BadRequestException } from '@nestjs/common';
// import { AuthGuard } from '../shared/middleware/auth.guard';
import { RolesGuard } from '../shared/middleware/roles.guard'; 
import { checkoutDtoArr } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards( RolesGuard)  // Apply guards to all routes in controller
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query('status') status: string, @Req() req: any) {
    return await this.ordersService.findAll(status, req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ordersService.findOne(id);
  }

  @Post('/checkout')
  async checkout(@Body() body: checkoutDtoArr, @Req() req: any) {
    if (!body.checkoutDetails || !Array.isArray(body.checkoutDetails)) {
      throw new BadRequestException('Invalid checkout details');
    }
    return await this.ordersService.checkout(body, req.user);
  }

  @Post('/webhook')
  @UseGuards() // Clear guards for webhook
  async webhook(
    @Body() rawBody: Buffer,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!sig) {
      throw new BadRequestException('Missing stripe signature');
    }
    return await this.ordersService.webhook(rawBody, sig);
  }
}