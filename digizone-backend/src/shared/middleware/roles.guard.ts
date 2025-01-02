import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { userTypes } from '../schema/users';
import { ROLES_KEY } from './role.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<userTypes[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Handle empty requiredRoles array
    if (!requiredRoles || requiredRoles.length === 0) { 
      // Allow access by default or implement your desired logic
      return true; 
    }

    const { user } = await context.switchToHttp().getRequest();
    if (!user || !user.type) {
      // Handle cases where user or user.type is undefined
      return false; 
    }

    return requiredRoles.some((role) => user.type.includes(role));
  }
}