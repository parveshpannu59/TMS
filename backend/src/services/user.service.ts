import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/auth.types';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  companyId?: string;
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
    const { name, email, password, role, phone, companyId } = userData;

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
      ...(companyId ? { companyId } : {}),
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

  static async getAllUsers(paginationOptions: any, filters: any = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = paginationOptions;
    
    const query: any = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user: any) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
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