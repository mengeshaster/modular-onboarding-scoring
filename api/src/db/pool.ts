import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../logger';

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err: Error) => {
  logger.error('Database connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database pool...');
  await pool.end();
});

process.on('SIGTERM', async () => {
  logger.info('Closing database pool...');
  await pool.end();
});