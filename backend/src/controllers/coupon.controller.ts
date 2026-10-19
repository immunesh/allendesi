import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { calculateCartPricing } from '../services/pricing.service';

type CouponInput = {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  stackingAllowed: boolean;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
};

function parseOptionalNumber(value: unknown, label: string) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new AppError(`${label} must be a non-negative number`, 400);
  return number;
}

function parseOptionalLimit(value: unknown, label: string) {
  const number = parseOptionalNumber(value, label);
  if (number == null) return null;
  if (!Number.isInteger(number) || number < 1) throw new AppError(`${label} must be a positive integer`, 400);
  return number;
}

function parseOptionalDate(value: unknown, label: string) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) throw new AppError(`${label} must be a valid date`, 400);
  return new Date(value);
}

function parseCoupon(body: Record<string, unknown>): CouponInput {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const type = typeof body.type === 'string' ? body.type.toUpperCase() : '';
  const value = Number(body.value);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new AppError('Coupon code must be 3–40 letters, numbers, underscores, or hyphens', 400);
  if (type !== 'PERCENTAGE' && type !== 'FIXED') throw new AppError('Coupon type must be PERCENTAGE or FIXED', 400);
  if (!Number.isFinite(value) || value <= 0 || (type === 'PERCENTAGE' && value > 100)) throw new AppError('Coupon value is invalid', 400);
  const startsAt = parseOptionalDate(body.startsAt, 'Start date');
  const expiresAt = parseOptionalDate(body.expiresAt, 'Expiry date');
  if (startsAt && expiresAt && expiresAt <= startsAt) throw new AppError('Expiry date must be later than its start date', 400);
  const ids = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  return {
    code,
    type,
    value,
    minOrder: parseOptionalNumber(body.minOrder, 'Minimum order'),
    maxDiscount: parseOptionalNumber(body.maxDiscount, 'Maximum discount'),
    usageLimit: parseOptionalLimit(body.usageLimit, 'Usage limit'),
    perUserLimit: parseOptionalLimit(body.perUserLimit, 'Per-customer limit'),
    startsAt,
    expiresAt,
    stackingAllowed: body.stackingAllowed === true,
    isActive: body.isActive !== false,
    productIds: ids(body.productIds),
    categoryIds: ids(body.categoryIds),
  };
}

async function validateEligibility(input: CouponInput) {
  const [products, categories] = await Promise.all([
    prisma.product.count({ where: { id: { in: input.productIds } } }),
    prisma.category.count({ where: { id: { in: input.categoryIds } } }),
  ]);
  if (products !== input.productIds.length || categories !== input.categoryIds.length) throw new AppError('One or more eligible products or categories do not exist', 400);
}

const couponData = (input: CouponInput) => ({
  code: input.code,
  type: input.type,
  value: input.value,
  minOrder: input.minOrder,
  maxDiscount: input.maxDiscount,
  usageLimit: input.usageLimit,
  perUserLimit: input.perUserLimit,
  startsAt: input.startsAt,
  expiresAt: input.expiresAt,
  stackingAllowed: input.stackingAllowed,
  isActive: input.isActive,
});

export const getAllCoupons = async (_req: AuthRequest, res: Response): Promise<void> => {
  const coupons = await prisma.coupon.findMany({
    include: { products: { include: { product: { select: { id: true, name: true } } } }, categories: { include: { category: { select: { id: true, name: true } } } }, _count: { select: { usages: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: coupons });
};

export const createCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = parseCoupon(req.body);
  await validateEligibility(input);
  const coupon = await prisma.coupon.create({
    data: {
      ...couponData(input),
      products: { create: input.productIds.map((productId) => ({ productId })) },
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
  res.status(201).json({ success: true, data: coupon });
};

export const updateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Coupon not found', 404);
  const input = parseCoupon(req.body);
  if (input.usageLimit != null && input.usageLimit < existing.usedCount) throw new AppError('Usage limit cannot be lower than existing uses', 400);
  await validateEligibility(input);
  const coupon = await prisma.coupon.update({
    where: { id: existing.id },
    data: {
      ...couponData(input),
      products: { deleteMany: {}, create: input.productIds.map((productId) => ({ productId })) },
      categories: { deleteMany: {}, create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
  res.json({ success: true, data: coupon });
};

export const toggleCouponStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!coupon) throw new AppError('Coupon not found', 404);
  const updated = await prisma.coupon.update({ where: { id: coupon.id }, data: { isActive: !coupon.isActive } });
  res.json({ success: true, data: updated });
};

export const applyCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  if (!code) throw new AppError('Coupon code is required', 400);
  const cartItems = await prisma.cartItem.findMany({ where: { userId: req.user!.userId }, include: { product: true } });
  if (!cartItems.length) throw new AppError('Cart is empty', 400);
  const pricing = await calculateCartPricing(cartItems.map((item) => ({ product: item.product, quantity: item.quantity })), { userId: req.user!.userId, couponCode: code });
  res.json({ success: true, data: { couponCode: pricing.couponCode, discount: pricing.couponDiscount, pricing } });
};

export const deleteCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!coupon) throw new AppError('Coupon not found', 404);
  if (coupon.usedCount > 0) throw new AppError('Used coupons cannot be deleted; deactivate the coupon instead', 409);
  await prisma.coupon.delete({ where: { id: coupon.id } });
  res.json({ success: true, message: 'Coupon deleted successfully' });
};
