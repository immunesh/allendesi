import { Router } from 'express';
import {
  createCampaign,
  deleteCampaign,
  listCampaigns,
  toggleCampaign,
  updateCampaign,
} from '../controllers/campaign.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.get('/', listCampaigns);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.patch('/:id/toggle', toggleCampaign);
router.delete('/:id', deleteCampaign);

export default router;
