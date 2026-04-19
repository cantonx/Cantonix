import { Router } from 'express';
import { ValidatorController } from '../controllers/ValidatorController';
import { ValidatorService } from '../services/ValidatorService';
import { validatorProvider } from '../providers';
import { authenticate } from '../middleware/authenticate';

const service    = new ValidatorService(validatorProvider);
const controller = new ValidatorController(service);
const router     = Router();

// All validator routes require authentication
router.get('/status',   authenticate, controller.getStatus);
router.post('/onboard', authenticate, controller.onboard);

export default router;
