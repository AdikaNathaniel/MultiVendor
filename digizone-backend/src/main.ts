import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';  // Updated path
import config from 'config';
import { TransformationInterceptor } from './responseInterceptor';
import cookieParser from 'cookie-parser';
import { NextFunction, raw, Request, Response } from 'express';
import csurf from 'csurf';
import express from 'express';

const ROOT_IGNORED_PATHS = [
  '/api/v1/orders/webhook',
  '/api/v1/users',
  '/api/v1/users/login',
  '/api/v1/products',
  '/api/v1/products/*/reviews',
  '/api/v1/products/*/reviews/*',
  '/api/v1/orders/Checkout',
  '/api/v1/products/update-product*'    
];

function isPathIgnored(path: string): boolean {
  return ROOT_IGNORED_PATHS.some(pattern => {
    const regexPattern = pattern
      .replace(/\*/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    
    // Enable CORS with more specific origins for production
    app.enableCors({
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.com']
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN']
    });

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(cookieParser());
    
    app.use('/api/v1/orders/webhook', raw({ type: '*/*' }));

    const csrfProtection = csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Updated for cross-site cookies in production
      }
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (isPathIgnored(req.path)) {
        return next();
      } else {
        return csrfProtection(req, res, next);
      }
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!isPathIgnored(req.path)) {
        const token = (req as any).csrfToken?.();
        if (token) {
          res.cookie('XSRF-TOKEN', token, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
          });
        }
      }
      next();
    });

    app.setGlobalPrefix(process.env.API_PREFIX || config.get('appPrefix'));
    app.useGlobalInterceptors(new TransformationInterceptor());

    // Use Vercel's port or fallback to config/default port
    const port = process.env.PORT || config.get('port') || 3000;
    
    await app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();