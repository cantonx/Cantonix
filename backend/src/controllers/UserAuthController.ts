/**
 * UserAuthController.ts
 *
 * Handles signup, login, and profile endpoints.
 *
 * POST /api/auth/signup  → register new user + get JWT
 * POST /api/auth/login   → authenticate + get JWT
 * GET  /api/me           → return authenticated user profile
 */

import { Request, Response } from 'express';
import { signup, login, getUserById, AuthError } from '../services/UserAuthService';

export class UserAuthController {
  // POST /api/auth/signup
  signup = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    try {
      const result = await signup(email, password);
      res.status(201).json({
        user:  result.user,
        token: result.token,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Signup failed' });
      }
    }
  };

  // POST /api/auth/login
  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    try {
      const result = await login(email, password);
      res.json({
        user:  result.user,
        token: result.token,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Login failed' });
      }
    }
  };

  // GET /api/me  (requires authenticate middleware)
  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  };
}
