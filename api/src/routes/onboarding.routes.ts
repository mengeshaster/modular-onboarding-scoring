import { Router } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey';
import { onboardingController } from '../controllers/onboarding.controller';

const router = Router();

// Apply API key middleware to all routes
router.use(apiKeyMiddleware);

/**
 * @swagger
 * /v1/onboarding:
 *   post:
 *     summary: Create a new onboarding session
 *     tags: [Onboarding]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OnboardingCreateRequest'
 *           example:
 *             userId: "123e4567-e89b-12d3-a456-426614174000"
 *             rawInput:
 *               personalInfo:
 *                 age: 30
 *                 income: 75000
 *                 employment: "full-time"
 *               preferences:
 *                 riskTolerance: "moderate"
 *               flags: []
 *     responses:
 *       201:
 *         description: Onboarding session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OnboardingSession'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', onboardingController.createSession.bind(onboardingController));

/**
 * @swagger
 * /v1/onboarding/{id}:
 *   get:
 *     summary: Get an onboarding session by ID
 *     tags: [Onboarding]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Onboarding session ID
 *     responses:
 *       200:
 *         description: Onboarding session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OnboardingSession'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', onboardingController.getSession.bind(onboardingController));

/**
 * @swagger
 * /v1/onboarding/recent/{user_id}:
 *   get:
 *     summary: Get recent onboarding sessions for a user
 *     tags: [Onboarding]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of recent onboarding sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecentSessionSummary'
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recent/:user_id', onboardingController.getRecentSessions.bind(onboardingController));

export { router as onboardingRoutes };