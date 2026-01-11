import { Response } from 'express';

interface ApiResponseData<T> {
  success: boolean;
  message: string;
  data?: T;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    } as ApiResponseData<T>);
  }

  static error(res: Response, message: string, statusCode = 500, error?: string): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      error,
    });
  }

  static created<T>(res: Response, data: T, message = 'Created'): Response {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}