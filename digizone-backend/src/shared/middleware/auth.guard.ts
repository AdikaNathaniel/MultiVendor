// // auth.guard.ts
// import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();
//     if (!request.user) {
//       throw new UnauthorizedException('User authentication required');
//     }
//     return true;
//   }
// }