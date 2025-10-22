export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  apiKey: process.env.API_KEY || 'dev-api-key',
  
  // Scoring service
  scorerUrl: process.env.INTERNAL_SCORER_URL || 'http://localhost:8000',
  scorerToken: process.env.INTERNAL_SCORER_TOKEN || 'dev-internal-token',
  
  // Database
  database: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'onboarding',
    user: process.env.PGUSER || 'onboarding',
    password: process.env.PGPASSWORD || 'onboarding',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  // Cache settings
  cache: {
    recentSessionsLimit: 10,
    recentSessionsTtl: 86400, // 24 hours in seconds
  },
};