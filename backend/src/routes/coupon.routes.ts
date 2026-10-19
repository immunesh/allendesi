import { Router } from "express";

import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  applyCoupon,
} from "../controllers/coupon.controller";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/apply",
  authenticate,
  authorize('CUSTOMER'),
  applyCoupon
);

/* ADMIN */
router.use(
  authenticate,
  authorize("ADMIN")
);

router.get(
  "/",
  getAllCoupons
);

router.post(
  "/",
  createCoupon
);

router.put('/:id', updateCoupon);

router.patch(
  "/:id/toggle",
  toggleCouponStatus
);

router.delete(
  "/:id",
  deleteCoupon
);

export default router;