import { Document, Model } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class PaginationHelper {
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  static parseOptions(query: any): PaginationOptions {
    const page = Math.max(1, parseInt(query.page) || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, parseInt(query.limit) || this.DEFAULT_LIMIT)
    );
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, sortBy, sortOrder };
  }

  static async paginate<T extends Document>(
    model: Model<T>,
    filter: Record<string, any>,
    options: PaginationOptions,
    populateFields?: string | string[]
  ): Promise<PaginatedResponse<T>> {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let query = model.find(filter).sort(sort).skip(skip).limit(limit).lean();

    if (populateFields) {
      if (Array.isArray(populateFields)) {
        populateFields.forEach(field => {
          query = query.populate(field);
        });
      } else {
        query = query.populate(populateFields);
      }
    }

    const [data, total] = await Promise.all([
      query.exec(),
      model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as T[],
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

  static createResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
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
}
