import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  createShipment,
  updateShipment,
  getSellerOrders,
  updateSellerOrderDecision,
} from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

/* ADMIN */
router.get(
  "/admin/all",
  authorize("ADMIN"),
  getAdminOrders
);

router.get(
  "/admin/:id",
  authorize("ADMIN"),
  getAdminOrderById
);

router.put(
  "/admin/:id/status",
  authorize("ADMIN"),
  updateOrderStatus
);

router.post(
  "/admin/:id/shipment",
  authorize("ADMIN", "SELLER"),
  createShipment
);

router.put(
  "/admin/:id/shipment",
  authorize("ADMIN", "SELLER"),
  updateShipment
);

/* SELLER & CUSTOMER */
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/seller', authorize('SELLER', 'ADMIN'), getSellerOrders);
router.patch('/:id/seller/status', authorize('SELLER', 'ADMIN'), updateSellerOrderDecision);
router.post('/seller/:id/shipment', authorize('SELLER', 'ADMIN'), createShipment);
router.put('/seller/:id/shipment', authorize('SELLER', 'ADMIN'), updateShipment);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);


export default router;
