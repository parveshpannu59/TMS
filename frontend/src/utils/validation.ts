import * as yup from 'yup';

/**
 * Login form validation schema
 * Validates email format and password requirements
 */
export const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email address is required')
    .trim()
    .lowercase()
    .email('Please enter a valid email address')
    .test('no-spaces', 'Email cannot have leading or trailing spaces', function(value) {
      if (!value) return true;
      // Ensure no extra spaces after normalization
      return value === value.trim();
    }),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters long')
    .test('no-spaces', 'Password cannot have leading or trailing spaces', function(value) {
      if (!value) return true;
      // Prevent passwords with only leading/trailing spaces
      return value === value.trim();
    }),
});

export type LoginFormData = yup.InferType<typeof loginSchema>;