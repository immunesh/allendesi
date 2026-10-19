import { Router } from 'express';
import {
  createSellerOffer,
  deleteAdminOffer,
  deleteSellerOffer,
  getAdminOfferSummary,
  getOfferPolicy,
  getSellerOfferSummary,
  listAdminOffers,
  listSellerOffers,
  reviewSellerOffer,
  updateOfferPolicy,
  updateSellerOffer,
  toggleSellerOffer,
} from '../controllers/offer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/seller/summary', authorize('SELLER'), getSellerOfferSummary);
router.get('/seller', authorize('SELLER'), listSellerOffers);
router.post('/seller', authorize('SELLER'), createSellerOffer);
router.put('/seller/:id', authorize('SELLER'), updateSellerOffer);
router.patch('/seller/:id/toggle', authorize('SELLER'), toggleSellerOffer);
router.delete('/seller/:id', authorize('SELLER'), deleteSellerOffer);

router.get('/admin/summary', authorize('ADMIN'), getAdminOfferSummary);
router.get('/admin/policy', authorize('ADMIN'), getOfferPolicy);
router.put('/admin/policy', authorize('ADMIN'), updateOfferPolicy);
router.get('/admin', authorize('ADMIN'), listAdminOffers);
router.patch('/admin/:id/review', authorize('ADMIN'), reviewSellerOffer);
router.delete('/admin/:id', authorize('ADMIN'), deleteAdminOffer);

export default router;
