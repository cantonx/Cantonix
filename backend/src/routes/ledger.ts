import { Router } from 'express';
import { LedgerController } from '../controllers/LedgerController';

const controller = new LedgerController();
const router     = Router();

router.get( '/:participant/v2/parties',                    controller.listParties);
router.post('/:participant/v2/parties',                    controller.createParty);
router.get( '/:participant/v2/users',                      controller.listUsers);
router.get( '/:participant/v2/users/:userId',              controller.getUser);
router.post('/:participant/v2/packages',                   controller.uploadDar);
router.post('/:participant/v2/commands/submit-and-wait',   controller.submitCommand);

export default router;
