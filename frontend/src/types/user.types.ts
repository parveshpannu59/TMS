export enum UserRole {
  OWNER = 'owner',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  ACCOUNTANT = 'accountant',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roleStats: Record<string, number>;
}