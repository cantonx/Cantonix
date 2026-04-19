import { Router } from 'express';
import { getCCPrice } from '../services/PriceService';

const router = Router();

// GET /api/price/cc  — public, no auth required
router.get('/cc', async (_req, res) => {
  try {
    const price = await getCCPrice();
    res.json(price);
  } catch {
    res.status(502).json({ error: 'Failed to fetch CC price' });
  }
});

export default router;
