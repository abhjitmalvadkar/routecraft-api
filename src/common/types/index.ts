import { Role } from '../../entities/enums';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: Role;
  orgId: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; details?: any } | null;
  message: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
