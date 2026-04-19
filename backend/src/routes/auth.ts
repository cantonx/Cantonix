/**
 * auth.ts — routes
 *
 * Public routes (no auth required):
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *
 * Protected routes (auth required):
 *   GET  /api/me
 *   POST /api/auth/token  (Keycloak oauth2 mode only)
 */

import { Router } from 'express';
import { UserAuthController } from '../controllers/UserAuthController';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authenticate';

const userAuth  = new UserAuthController();
const cantonAuth = new AuthController();
const router    = Router();

// ─── User auth (JWT) ──────────────────────────────────────────────────────
router.post('/signup', userAuth.signup);
router.post('/login',  userAuth.login);

// ─── Keycloak token (Canton oauth2 mode) ─────────────────────────────────
router.post('/token', cantonAuth.getToken);

export default router;
