import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/auth.types';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  status?: 'active' | 'inactive';
}

interface ChangePasswordData {
  newPassword: string;
}

export class UserService {
  static async createUser(userData: CreateUserData) {
    const { name, email, password, role, phone } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      status: 'active',
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  static async getAllUsers() {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    }));
  }

  static async getUserById(userId: string) {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  static async updateUser(userId: string, updateData: UpdateUserData) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        throw ApiError.badRequest('Email already exists');
      }
    }

    Object.assign(user, updateData);
    await user.save();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  static async changePassword(userId: string, passwordData: ChangePasswordData) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.password = passwordData.newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  static async deleteUser(userId: string) {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  static async getUserStats() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const roleStats = usersByRole.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats,
    };
  }
}