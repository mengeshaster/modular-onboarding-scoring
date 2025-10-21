import { pool } from '../db/pool';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateOnboardingRequest,
  OnboardingSession,
  ParsedData,
  RecentSessionSummary,
} from '../validation/onboarding.schema';
import { redisService } from './redis.service';
import { scoringClient } from './scoring.client';

export class OnboardingService {
  async createSession(
    request: CreateOnboardingRequest,
    sourceIp?: string,
    userAgent?: string
  ): Promise<OnboardingSession> {
    const sessionId = uuidv4();
    const createdAt = new Date();

    // Parse and validate the input data
    const parsedData = this.parseRawInput(request.rawInput);

    try {
      // Insert initial session record without score
      const insertQuery = `
        INSERT INTO onboarding_sessions 
        (id, user_id, created_at, raw_input, parsed_data, source_ip, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await pool.query(insertQuery, [
        sessionId,
        request.userId,
        createdAt,
        JSON.stringify(request.rawInput),
        JSON.stringify(parsedData),
        sourceIp || null,
        userAgent || null,
      ]);

      logger.info('Created onboarding session', { sessionId, userId: request.userId });

      // Get score from scoring service
      let score: number | null = null;
      let scoreExplanation: string | null = null;

      try {
        const scoreResponse = await scoringClient.getScore(request.userId, parsedData);
        score = scoreResponse.score;
        scoreExplanation = scoreResponse.explanation;

        // Update session with score
        const updateQuery = `
          UPDATE onboarding_sessions 
          SET score = $1, score_explanation = $2
          WHERE id = $3
        `;

        await pool.query(updateQuery, [score, scoreExplanation, sessionId]);

        logger.info('Updated session with score', { sessionId, score });
      } catch (error) {
        logger.warn('Failed to get score, session saved without score', { sessionId, error });
        // Continue without score - the session is still valid
      }

      // Add to recent sessions cache
      if (score !== null) {
        const sessionSummary: RecentSessionSummary = {
          id: sessionId,
          createdAt: createdAt.toISOString(),
          score,
        };

        await redisService.addRecentSession(request.userId, sessionSummary);
      }

      // Return the complete session
      return {
        id: sessionId,
        userId: request.userId,
        createdAt: createdAt.toISOString(),
        rawInput: request.rawInput,
        parsedData,
        score,
        scoreExplanation,
        sourceIp: sourceIp || null,
        userAgent: userAgent || null,
      };
    } catch (error) {
      logger.error('Failed to create onboarding session:', error);
      throw error;
    }
  }

  async getSessionById(sessionId: string): Promise<OnboardingSession | null> {
    try {
      const query = `
        SELECT id, user_id, created_at, raw_input, parsed_data, 
               score, score_explanation, source_ip, user_agent
        FROM onboarding_sessions 
        WHERE id = $1
      `;

      const result = await pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at.toISOString(),
        rawInput: row.raw_input,
        parsedData: row.parsed_data,
        score: row.score,
        scoreExplanation: row.score_explanation,
        sourceIp: row.source_ip,
        userAgent: row.user_agent,
      };
    } catch (error) {
      logger.error('Failed to get session by ID:', error);
      throw error;
    }
  }

  async getRecentSessions(userId: string): Promise<RecentSessionSummary[]> {
    try {
      return await redisService.getRecentSessions(userId);
    } catch (error) {
      logger.error('Failed to get recent sessions:', error);
      return [];
    }
  }

  private parseRawInput(rawInput: any): ParsedData {
    // Simple parsing logic - in a real application, this would be more sophisticated
    const parsed: ParsedData = {};

    if (rawInput.personalInfo) {
      parsed.personalInfo = {
        age: rawInput.personalInfo.age,
        income: rawInput.personalInfo.income,
        employment: rawInput.personalInfo.employment,
        education: rawInput.personalInfo.education,
      };
    }

    if (rawInput.preferences) {
      parsed.preferences = {
        riskTolerance: rawInput.preferences.riskTolerance,
        investmentGoals: rawInput.preferences.investmentGoals,
        timeHorizon: rawInput.preferences.timeHorizon,
      };
    }

    if (rawInput.flags) {
      parsed.flags = Array.isArray(rawInput.flags) ? rawInput.flags : [];
    }

    return parsed;
  }
}

export const onboardingService = new OnboardingService();