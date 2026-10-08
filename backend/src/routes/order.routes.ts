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
  authorize("ADMIN"),
  createShipment
);

router.put(
  "/admin/:id/shipment",
  authorize("ADMIN"),
  updateShipment
);
/* CUSTOMER */
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/seller', authorize('SELLER'), getSellerOrders);
router.patch('/:id/seller/status', authorize('SELLER'), updateSellerOrderDecision);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);


export default router;
