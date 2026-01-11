import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

export const config: EnvConfig = {
  port: parseInt(getEnvVar('PORT', '5000'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  mongoUri: getEnvVar('MONGODB_URI'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  r2: {
    accountId: getOptionalEnvVar('R2_ACCOUNT_ID'),
    accessKeyId: getOptionalEnvVar('R2_ACCESS_KEY_ID'),
    secretAccessKey: getOptionalEnvVar('R2_SECRET_ACCESS_KEY'),
    bucketName: getOptionalEnvVar('R2_BUCKET_NAME', 'tms-documents'),
    publicUrl: getOptionalEnvVar('R2_PUBLIC_URL'),
  },
};