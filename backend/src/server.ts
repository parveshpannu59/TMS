import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API Base: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});