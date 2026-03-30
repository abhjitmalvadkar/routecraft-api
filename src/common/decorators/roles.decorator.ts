import { SetMetadata } from '@nestjs/common';
import { Role } from '../../entities/enums';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
