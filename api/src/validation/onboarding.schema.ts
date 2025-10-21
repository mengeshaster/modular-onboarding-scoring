import { z } from 'zod';

// UUID validation schema
export const uuidSchema = z.string().uuid();

// Raw input schema - flexible but demonstrative structure
export const rawInputSchema = z.object({
  personalInfo: z.object({
    age: z.number().min(18).max(100).optional(),
    income: z.number().min(0).optional(),
    employment: z.enum(['full-time', 'part-time', 'unemployed', 'self-employed', 'retired']).optional(),
    education: z.enum(['high-school', 'bachelors', 'masters', 'phd', 'other']).optional(),
  }).optional(),
  preferences: z.object({
    riskTolerance: z.enum(['low', 'moderate', 'high']).optional(),
    investmentGoals: z.array(z.string()).optional(),
    timeHorizon: z.enum(['short', 'medium', 'long']).optional(),
  }).optional(),
  flags: z.array(z.string()).optional(),
  // Allow additional properties for flexibility
}).passthrough();

// Onboarding creation request schema
export const createOnboardingRequestSchema = z.object({
  userId: uuidSchema,
  rawInput: rawInputSchema,
});

// Parsed data schema (after validation)
export const parsedDataSchema = z.object({
  personalInfo: z.object({
    age: z.number().optional(),
    income: z.number().optional(),
    employment: z.string().optional(),
    education: z.string().optional(),
  }).optional(),
  preferences: z.object({
    riskTolerance: z.string().optional(),
    investmentGoals: z.array(z.string()).optional(),
    timeHorizon: z.string().optional(),
  }).optional(),
  flags: z.array(z.string()).optional(),
  // Additional properties allowed
}).passthrough();

// Onboarding session response schema
export const onboardingSessionSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  createdAt: z.string(),
  rawInput: z.any(),
  parsedData: z.any(),
  score: z.number().min(0).max(100).nullable(),
  scoreExplanation: z.string().nullable(),
  sourceIp: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

// Recent session summary schema
export const recentSessionSummarySchema = z.object({
  id: uuidSchema,
  createdAt: z.string(),
  score: z.number().min(0).max(100).nullable(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// Types derived from schemas
export type CreateOnboardingRequest = z.infer<typeof createOnboardingRequestSchema>;
export type RawInput = z.infer<typeof rawInputSchema>;
export type ParsedData = z.infer<typeof parsedDataSchema>;
export type OnboardingSession = z.infer<typeof onboardingSessionSchema>;
export type RecentSessionSummary = z.infer<typeof recentSessionSummarySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;