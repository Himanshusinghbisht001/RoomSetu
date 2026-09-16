import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Establishes a connection to MongoDB Atlas using Mongoose.
 * Credentials are masked in log output — the real URI is never printed.
 */
export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    // Mask credentials in log output — never expose the real URI
    const maskedUri = env.MONGODB_URI.replace(
      /(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/,
      '$1***:***@',
    );

    logger.info('Connecting to MongoDB...', { uri: maskedUri });

    await mongoose.connect(env.MONGODB_URI, {
      // Connection pool
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('MongoDB connection failed', { message });
    process.exit(1);
  }
}

/**
 * Gracefully closes the Mongoose connection.
 * Called during process shutdown.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
