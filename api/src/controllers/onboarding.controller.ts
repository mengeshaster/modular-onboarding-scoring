import { Request, Response, NextFunction } from 'express';
import { createOnboardingRequestSchema } from '../validation/onboarding.schema';
import { onboardingService } from '../services/onboarding.service';
import { logger } from '../logger';

export class OnboardingController {
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validatedData = createOnboardingRequestSchema.parse(req.body);

      // Extract client information
      const sourceIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Create session
      const session = await onboardingService.createSession(
        validatedData,
        sourceIp,
        userAgent
      );

      logger.info('Onboarding session created successfully', {
        sessionId: session.id,
        userId: session.userId,
      });

      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Session ID is required',
          },
        });
        return;
      }

      const session = await onboardingService.getSessionById(id);

      if (!session) {
        res.status(404).json({
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Onboarding session not found',
          },
        });
        return;
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async getRecentSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;

      if (!user_id) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'User ID is required',
          },
        });
        return;
      }

      // Validate user_id is a valid UUID
      try {
        // Simple UUID validation - you could use a more robust validation
        if (!user_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          throw new Error('Invalid UUID format');
        }
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'INVALID_USER_ID',
            message: 'User ID must be a valid UUID',
          },
        });
        return;
      }

      const recentSessions = await onboardingService.getRecentSessions(user_id);

      res.json(recentSessions);
    } catch (error) {
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController();