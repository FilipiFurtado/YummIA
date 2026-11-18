import { SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from '../guards/jwt-auth.guard.js';

export const ROLES_KEY = 'roles';

export type UserRoleName = AuthenticatedUser['role'];

export const Roles = (...roles: UserRoleName[]) =>
  SetMetadata(ROLES_KEY, roles);