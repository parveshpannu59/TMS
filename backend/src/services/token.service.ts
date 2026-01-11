import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types/auth.types';
import { ApiError } from '../utils/ApiError';

export class TokenService {
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token has expired. Please login again.');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid token. Please login again.');
      }
      throw ApiError.unauthorized('Authentication failed.');
    }
  }

  static getTokenExpiryDate(): string {
    const expiryHours = parseInt(config.jwtExpiresIn.replace('h', ''), 10);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);
    return expiryDate.toISOString();
  }

  static extractTokenFromHeader(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided.');
    }
    return authHeader.substring(7);
  }
}