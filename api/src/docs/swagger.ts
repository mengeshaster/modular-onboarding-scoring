import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Modular Onboarding + Scoring API',
      version: '1.0.0',
      description: 'A comprehensive onboarding and scoring system API',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key required for authentication',
        },
      },
      schemas: {
        OnboardingCreateRequest: {
          type: 'object',
          required: ['userId', 'rawInput'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the user',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            rawInput: {
              type: 'object',
              description: 'Raw onboarding input from the user',
              properties: {
                personalInfo: {
                  type: 'object',
                  properties: {
                    age: {
                      type: 'number',
                      minimum: 18,
                      maximum: 100,
                      example: 30,
                    },
                    income: {
                      type: 'number',
                      minimum: 0,
                      example: 75000,
                    },
                    employment: {
                      type: 'string',
                      enum: ['full-time', 'part-time', 'unemployed', 'self-employed', 'retired'],
                      example: 'full-time',
                    },
                    education: {
                      type: 'string',
                      enum: ['high-school', 'bachelors', 'masters', 'phd', 'other'],
                      example: 'bachelors',
                    },
                  },
                },
                preferences: {
                  type: 'object',
                  properties: {
                    riskTolerance: {
                      type: 'string',
                      enum: ['low', 'moderate', 'high'],
                      example: 'moderate',
                    },
                    investmentGoals: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      example: ['retirement', 'education'],
                    },
                    timeHorizon: {
                      type: 'string',
                      enum: ['short', 'medium', 'long'],
                      example: 'long',
                    },
                  },
                },
                flags: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Any risk flags or special considerations',
                  example: [],
                },
              },
              example: {
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
            },
          },
        },
        OnboardingSession: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique session identifier',
              example: '456e7890-e89b-12d3-a456-426614174001',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User identifier',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation timestamp',
              example: '2025-10-21T10:30:00.000Z',
            },
            rawInput: {
              type: 'object',
              description: 'Original raw input from user',
            },
            parsedData: {
              type: 'object',
              description: 'Validated and processed data',
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              nullable: true,
              description: 'Calculated onboarding score',
              example: 78,
            },
            scoreExplanation: {
              type: 'string',
              nullable: true,
              description: 'Human-readable explanation of the score',
              example: 'Good income and stable employment with moderate risk tolerance',
            },
            sourceIp: {
              type: 'string',
              nullable: true,
              description: 'Client IP address',
              example: '192.168.1.100',
            },
            userAgent: {
              type: 'string',
              nullable: true,
              description: 'Client user agent string',
              example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        },
        RecentSessionSummary: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Session identifier',
              example: '456e7890-e89b-12d3-a456-426614174001',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation timestamp',
              example: '2025-10-21T10:30:00.000Z',
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              nullable: true,
              description: 'Session score',
              example: 78,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'Invalid request data',
                },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
      },
    },
    tags: [
      {
        name: 'Onboarding',
        description: 'Onboarding session management',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);