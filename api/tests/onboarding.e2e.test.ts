import request from 'supertest';
import { createServer } from '../src/server';
import { pool } from '../src/db/pool';
import { redisService } from '../src/services/redis.service';

describe('Onboarding API E2E Tests', () => {
  let app: any;
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const apiKey = 'dev-api-key';

  beforeAll(async () => {
    app = createServer();
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await redisService.disconnect();
    await pool.end();
  });

  describe('POST /v1/onboarding', () => {
    it('should create a new onboarding session with valid data', async () => {
      const requestBody = {
        userId: testUserId,
        rawInput: {
          personalInfo: {
            age: 30,
            income: 75000,
            employment: 'full-time',
          },
          preferences: {
            riskTolerance: 'moderate',
          },
          flags: [],
        },
      };

      const response = await request(app)
        .post('/v1/onboarding')
        .set('x-api-key', apiKey)
        .send(requestBody)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('rawInput');
      expect(response.body).toHaveProperty('parsedData');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('scoreExplanation');

      // Score should be between 0 and 100
      if (response.body.score !== null) {
        expect(response.body.score).toBeGreaterThanOrEqual(0);
        expect(response.body.score).toBeLessThanOrEqual(100);
      }
    });

    it('should return 400 for invalid request data', async () => {
      const requestBody = {
        userId: 'invalid-uuid',
        rawInput: {},
      };

      const response = await request(app)
        .post('/v1/onboarding')
        .set('x-api-key', apiKey)
        .send(requestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return 401 for missing API key', async () => {
      const requestBody = {
        userId: testUserId,
        rawInput: {
          personalInfo: {
            age: 30,
          },
        },
      };

      const response = await request(app)
        .post('/v1/onboarding')
        .send(requestBody)
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    it('should return 401 for invalid API key', async () => {
      const requestBody = {
        userId: testUserId,
        rawInput: {
          personalInfo: {
            age: 30,
          },
        },
      };

      const response = await request(app)
        .post('/v1/onboarding')
        .set('x-api-key', 'invalid-key')
        .send(requestBody)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });
  });

  describe('GET /v1/onboarding/recent/:user_id', () => {
    it('should return recent sessions for a user', async () => {
      // First create a session
      const requestBody = {
        userId: testUserId,
        rawInput: {
          personalInfo: {
            age: 25,
            income: 50000,
          },
          flags: [],
        },
      };

      await request(app)
        .post('/v1/onboarding')
        .set('x-api-key', apiKey)
        .send(requestBody)
        .expect(201);

      // Then get recent sessions
      const response = await request(app)
        .get(`/v1/onboarding/recent/${testUserId}`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const session = response.body[0];
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('createdAt');
        expect(session).toHaveProperty('score');
      }
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/v1/onboarding/recent/invalid-uuid')
        .set('x-api-key', apiKey)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_USER_ID');
    });
  });

  describe('GET /v1/onboarding/:id', () => {
    it('should return 404 for non-existent session', async () => {
      const nonExistentId = '456e7890-e89b-12d3-a456-426614174001';
      
      const response = await request(app)
        .get(`/v1/onboarding/${nonExistentId}`)
        .set('x-api-key', apiKey)
        .expect(404);

      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});