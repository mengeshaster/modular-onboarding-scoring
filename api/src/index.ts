import dotenv from 'dotenv';
import { createServer } from './server';
import { logger } from './logger';
import { runMigrations } from './db/migrations/runner';

// Load environment variables
dotenv.config();

async function start() {
  try {
    // Run database migrations
    await runMigrations();
    logger.info('Database migrations completed');

    // Create and start server
    const app = createServer();
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`API Documentation available at http://localhost:${port}/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

start();