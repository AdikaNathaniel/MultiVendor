import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { decodeAuthToken } from '../utility/token-generator';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(UserRepository) private readonly userDB: UserRepository,
  ) {}

  async use(req: Request | any, res: Response, next: NextFunction) {
    try {
      console.log('AuthMiddleware', req.headers);
      
      // If the route is public, allow access without authentication
      if (this.isPublicRoute(req.path, req.method) || this.isCsrfSkippedRoute(req.originalUrl)) {
        return next();
      }

      const token = req.cookies._digi_auth_token;
      if (!token) {
        throw new UnauthorizedException('Missing auth token');
      }

      const decodedData: any = decodeAuthToken(token);
      const user = await this.userDB.findById(decodedData.id);
      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }

      user.password = undefined;
      req.user = user;

      next();
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  private isPublicRoute(path: string, method: string): boolean {
    const publicRoutes = [
      // App routes
      { path: '/api/v1', method: 'GET' },
      { path: '/api/v1/test', method: 'GET' },
      { path: '/api/v1/csrf-token', method: 'GET' },

      // User routes
      { path: '/api/v1/users', method: 'POST' }, // signup
      { path: '/api/v1/users', method: 'GET' }, // get all users
      { path: '/api/v1/users/login', method: 'POST' },
      { path: '/api/v1/users/verify-email', method: 'GET' },
      { path: '/api/v1/users/send-otp-email', method: 'GET' },
      { path: '/api/v1/users/logout', method: 'PUT' },
      { path: '/api/v1/users/forgot-password', method: 'GET' },
      { path: '/api/v1/users/update-name-password', method: 'PATCH' },
      { path: '/api/v1/users', method: 'DELETE' },

      // Product routes
      { path: '/api/v1/products', method: 'POST' },
      { path: '/api/v1/products', method: 'GET' },
      { path: '/api/v1/products/', method: 'GET' }, // single product
      { path: '/api/v1/products/', method: 'PATCH' },
      { path: '/api/v1/products/', method: 'DELETE' },
      { path: '/api/v1/products/', method: 'POST' }, // for image upload
      
      // SKU routes
      { path: '/api/v1/products/', method: 'POST' }, // for SKUs
      { path: '/api/v1/products/', method: 'PUT' }, // update SKU
      { path: '/api/v1/products/', method: 'DELETE' }, // delete SKU

      // License routes
      { path: '/api/v1/products/', method: 'POST' }, // for licenses
      { path: '/api/v1/products/licenses/', method: 'DELETE' },
      { path: '/api/v1/products/', method: 'GET' }, // get licenses
      { path: '/api/v1/products/', method: 'PUT' }, // update license

      // Review routes
      { path: '/api/v1/products/', method: 'POST' }, // for reviews
      { path: '/api/v1/products/', method: 'DELETE' }, // delete review

      // Order routes
      // { path: '/api/v1/orders', method: 'GET' },
      // { path: '/api/v1/orders/', method: 'GET' },
      // { path: '/api/v1/orders/checkout', method: 'POST' },
      { path: '/api/v1/orders/webhook', method: 'POST' }
    ];

    return publicRoutes.some(route => {
      // Handle both exact matches and routes with parameters
      const pathMatch = path.startsWith(route.path);
      return pathMatch && method === route.method;
    });
  }

  private isCsrfSkippedRoute(url: string): boolean {
    // Define conditions to skip CSRF check for specific routes
    return url.includes('/orders/webhook');
  }
}