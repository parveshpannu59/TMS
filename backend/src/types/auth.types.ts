export enum UserRole {
  OWNER = 'owner',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  ACCOUNTANT = 'accountant',
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: string;
    companyId?: string;
    profilePicture?: string;
  };
  expiresAt: string;
}