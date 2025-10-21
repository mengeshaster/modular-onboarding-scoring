import { pool } from '../pool';
import { logger } from '../../logger';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get list of executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const executedFiles = new Set(executedMigrations.map((row: any) => row.filename));

    // Get list of migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (!executedFiles.has(filename)) {
        logger.info(`Running migration: ${filename}`);
        
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query('BEGIN');
        try {
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [filename]
          );
          await client.query('COMMIT');
          logger.info(`Migration completed: ${filename}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}