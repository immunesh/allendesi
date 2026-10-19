import { upload } from '../middleware/upload';
import { Router } from "express";
import {
  getProducts,
  getProductById,
  getCategories,
  getFeaturedProducts,
  getSellerProducts,
  getRelatedProducts,
  assignProductToSeller,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/categories", getCategories);
router.get('/seller', authenticate, authorize('SELLER'), getSellerProducts);
router.patch('/admin/:id/assign-seller', authenticate, authorize('ADMIN'), assignProductToSeller);

router.get("/:id", getProductById);

router.post("/", authenticate, authorize('ADMIN', 'SELLER'), upload.single("image"), createProduct);
router.put("/:id", authenticate, authorize('ADMIN', 'SELLER'), updateProduct);
router.delete("/:id", authenticate, authorize('ADMIN', 'SELLER'), deleteProduct);

router.get("/:id/related", getRelatedProducts);

export default router;