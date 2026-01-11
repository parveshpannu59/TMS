import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { TokenService } from './token.service';
import { AuthResponse, LoginRequest } from '../types/auth.types';

export class AuthService {
  /**
   * Authenticate user with email and password
   * @param credentials - User login credentials (email and password)
   * @returns Authentication response with token and user data
   * @throws ApiError if email not found, password incorrect, or account inactive
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user by email with password field selected
    const user = await User.findOne({ email }).select('+password');

    // User not found - return generic message for security (prevent email enumeration)
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password. Please check your credentials and try again.');
    }

    // Check if user account is active
    if (user.status !== 'active') {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support for assistance.');
    }

    // Verify password using bcrypt comparison
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password. Please check your credentials and try again.');
    }

    // Generate JWT token
    const token = TokenService.generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const expiresAt = TokenService.getTokenExpiryDate();

    // Return response without password for security
    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      expiresAt,
    };
  }

  static async verifyUser(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Your account is inactive');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }
}