import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import config from 'config';
import { TransformationInterceptor } from './src/responseInterceptor';
import cookieParser from 'cookie-parser';
import { NextFunction, raw, Request, Response } from 'express';
import csurf from 'csurf';
import express from 'express';

const ROOT_IGNORED_PATHS = [
  '/api/v1/orders/webhook',
  '/api/v1/users',
  '/api/v1/users/login',
  '/api/v1/products',
  '/api/v1/products/*/reviews',      // For POST reviews
  '/api/v1/products/*/reviews/*',    // For DELETE reviews
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
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true
  });

  // Add parsers before CSRF
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Special handling for webhook
  app.use('/api/v1/orders/webhook', raw({ type: '*/*' }));

  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  });

  // Apply CSRF protection with path exclusions
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isPathIgnored(req.path)) {
      return next();
    } else {
      return csrfProtection(req, res, next);
    }
  });

  // Set CSRF token in cookie for routes that require it
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isPathIgnored(req.path)) {
      const token = (req as any).csrfToken?.();
      if (token) {
        res.cookie('XSRF-TOKEN', token);
      }
    }
    next();
  });

  app.setGlobalPrefix(config.get('appPrefix'));
  app.useGlobalInterceptors(new TransformationInterceptor());

  await app.listen(config.get('port'), () => {
    return console.log(`Server is running on port ${config.get('port')}`);
  });
}

bootstrap();