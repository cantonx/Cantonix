import { Router } from 'express';
import { SwapController } from '../controllers/SwapController';
import { SwapService } from '../services/SwapService';
import { swapProvider } from '../providers';
import { authenticate } from '../middleware/authenticate';

const service    = new SwapService(swapProvider);
const controller = new SwapController(service);
const router     = Router();

router.post('/execute', authenticate, controller.execute);
router.get('/history',  authenticate, controller.history);

export default router;
