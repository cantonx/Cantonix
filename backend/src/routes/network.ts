import { Router } from 'express';
import { NetworkController } from '../controllers/NetworkController';
import { ValidatorService } from '../services/ValidatorService';
import { validatorProvider } from '../providers';
import { authenticate } from '../middleware/authenticate';

const service    = new ValidatorService(validatorProvider);
const controller = new NetworkController(service);
const router     = Router();

router.get('/status', authenticate, controller.getStatus);

export default router;
