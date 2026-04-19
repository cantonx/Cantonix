import { Router } from 'express';
import { UserAuthController } from '../controllers/UserAuthController';
import { authenticate } from '../middleware/authenticate';

const controller = new UserAuthController();
const router     = Router();

router.get('/', authenticate, controller.me);

export default router;
