import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { ParsedData } from '../validation/onboarding.schema';

export interface ScoreRequest {
  userId: string;
  parsedData: ParsedData;
}

export interface ScoreResponse {
  score: number;
  explanation: string;
}

export class ScoringClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = config.scorerUrl;
    this.token = config.scorerToken;
  }

  async getScore(userId: string, parsedData: ParsedData): Promise<ScoreResponse> {
    try {
      logger.debug('Requesting score from scoring service', { userId });

      const response = await axios.post<ScoreResponse>(
        `${this.baseUrl}/score`,
        { userId, parsedData } as ScoreRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': this.token,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      logger.debug('Received score from scoring service', {
        userId,
        score: response.data.score,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get score from scoring service:', error);

      if (axios.isAxiosError(error)) {
        if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ETIMEDOUT') {
          throw new Error('SCORER_UNREACHABLE');
        }
        if (error.response?.status === 401) {
          throw new Error('SCORER_UNAUTHORIZED');
        }
      }

      throw new Error('SCORER_ERROR');
    }
  }
}

export const scoringClient = new ScoringClient();