import * as yup from 'yup';
import { UserRole } from '../types/user.types';

export const createUserSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  role: yup
    .string()
    .required('Role is required')
    .oneOf(Object.values(UserRole), 'Invalid role'),
  phone: yup
    .string()
    .optional()
    .matches(/^[0-9]{10}$/, 'Phone must be 10 digits')
    .nullable(),
});

export const updateUserSchema = yup.object({
  name: yup
    .string()
    .optional()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: yup.string().optional().email('Please enter a valid email').trim().lowercase(),
  role: yup.string().optional().oneOf(Object.values(UserRole), 'Invalid role'),
  phone: yup
    .string()
    .optional()
    .matches(/^[0-9]{10}$/, 'Phone must be 10 digits')
    .nullable(),
  status: yup.string().optional().oneOf(['active', 'inactive'], 'Invalid status'),
});

export const changePasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type CreateUserFormData = yup.InferType<typeof createUserSchema>;
export type UpdateUserFormData = yup.InferType<typeof updateUserSchema>;
export type ChangePasswordFormData = yup.InferType<typeof changePasswordSchema>;