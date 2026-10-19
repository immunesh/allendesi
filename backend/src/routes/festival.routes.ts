import { Router } from 'express';
import {
  adminFestivals, adminPreviewFestival, createFestival, createFestivalProduct, deleteFestival, deleteSellerFestivalProduct,
  festivalStats, publicFestivalBySlug, publicFestivals, reviewFestivalProduct, sellerFestivalAssignments,
  sellerFestivalStats, sellerFestivals, updateFestival, updateSellerFestivalProduct,
} from '../controllers/festival.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.get('/', publicFestivals);
router.get('/admin/stats', authenticate, authorize('ADMIN'), festivalStats);
router.get('/admin', authenticate, authorize('ADMIN'), adminFestivals);
router.get('/admin/preview/:slug', authenticate, authorize('ADMIN'), adminPreviewFestival);
router.post('/admin', authenticate, authorize('ADMIN'), createFestival);
router.put('/admin/:id', authenticate, authorize('ADMIN'), updateFestival);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), deleteFestival);
router.patch('/admin/products/:assignmentId/status', authenticate, authorize('ADMIN'), reviewFestivalProduct);
router.get('/seller/available', authenticate, authorize('SELLER'), sellerFestivals);
router.get('/seller/stats', authenticate, authorize('SELLER'), sellerFestivalStats);
router.get('/seller/mine', authenticate, authorize('SELLER'), sellerFestivalAssignments);
router.post('/seller/:festivalId/products', authenticate, authorize('SELLER'), createFestivalProduct);
router.put('/seller/products/:assignmentId', authenticate, authorize('SELLER'), updateSellerFestivalProduct);
router.delete('/seller/products/:assignmentId', authenticate, authorize('SELLER'), deleteSellerFestivalProduct);
router.get('/:slug', publicFestivalBySlug);
export default router;