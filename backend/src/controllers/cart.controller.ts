import { Response } from "express";
import { prisma } from "../db/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { calculateCartPricing } from '../services/pricing.service';

async function addCartPricing(userId: string, items: any[]) {
  const pricing = await calculateCartPricing(
    items.map((item) => ({ product: item.product, quantity: item.quantity, festivalId: parseFestivalId(item.variant) })),
    { userId }
  );
  const byProductId = new Map(pricing.lines.map((line) => [line.productId, line]));
  return {
    items: items.map((item) => {
      const line = byProductId.get(item.productId);
      if (!line) return item;
      return {
        ...item,
        product: {
          ...item.product,
          salePrice: line.price < line.originalPrice ? line.price : null,
          priceBreakdown: {
            originalPrice: line.originalPrice,
            finalPrice: line.price,
            sellerDiscount: line.sellerDiscount,
            campaignDiscount: line.campaignDiscount,
            couponDiscount: line.couponDiscount,
          },
        },
      };
    }),
    pricing,
  };
}

function parseFestivalId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.festivalId === 'string' ? parsed.festivalId : undefined;
  } catch { return undefined; }
}

/* ===========================
   USER CART
=========================== */

export const getCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const cart = await prisma.cartItem.findMany({
    where: {
      userId: req.user!.userId,
    },
    include: {
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });

  const priced = await addCartPricing(req.user!.userId, cart);
  res.json({
    success: true,
    data: priced.items,
    pricing: priced.pricing,
  });
};

export const addToCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { productId, quantity = 1, variant } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1) throw new AppError('Quantity must be a positive whole number', 400);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (!product.isActive || product.stock < quantity) {
    throw new AppError("Insufficient stock", 400);
  }

  const festivalId = variant && typeof variant.festivalId === 'string' ? variant.festivalId : undefined;
  if (festivalId) {
    const listing = await prisma.festivalProduct.findFirst({ where: {
      festivalId, productId, status: 'APPROVED', festival: { isActive: true, isPublished: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
    } });
    if (!listing || (listing.stock != null && listing.stock < quantity)) throw new AppError('This festival listing is no longer available', 409);
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: req.user!.userId,
        productId,
      },
    },
  });

  const variantStr = variant
    ? JSON.stringify(variant)
    : null;

  if (existing) {
    const requestedTotal = existing.quantity + quantity;
    if (requestedTotal > product.stock) throw new AppError('Cart quantity exceeds available stock', 400);
    if (festivalId) {
      const listing = await prisma.festivalProduct.findUnique({ where: { festivalId_productId: { festivalId, productId } } });
      if (!listing || (listing.stock != null && requestedTotal > listing.stock)) throw new AppError('Cart quantity exceeds festival listing stock', 400);
    }
    const updated = await prisma.cartItem.update({
      where: {
        id: existing.id,
      },
      data: {
        quantity: existing.quantity + quantity,
        variant: variantStr,
      },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    const cart = await prisma.cartItem.findMany({ where: { userId: req.user!.userId }, include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } });
    const priced = await addCartPricing(req.user!.userId, cart);
    res.json({
      success: true,
      data: priced.items.find((item) => item.id === updated.id) || updated,
      pricing: priced.pricing,
    });

    return;
  }

  const item = await prisma.cartItem.create({
    data: {
      userId: req.user!.userId,
      productId,
      quantity,
      variant: variantStr,
    },
    include: {
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });

  const cart = await prisma.cartItem.findMany({ where: { userId: req.user!.userId }, include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } });
  const priced = await addCartPricing(req.user!.userId, cart);
  res.status(201).json({
    success: true,
    data: priced.items.find((cartItem) => cartItem.id === item.id) || item,
    pricing: priced.pricing,
  });
};

export const updateCartItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!Number.isInteger(quantity)) throw new AppError('Quantity must be a whole number', 400);

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    res.json({
      success: true,
      message: "Item removed from cart",
    });

    return;
  }

  const existingCartItem = await prisma.cartItem.findFirst({ where: { id, userId: req.user!.userId }, include: { product: true } });
  if (!existingCartItem || !existingCartItem.product.isActive || existingCartItem.product.stock < quantity) throw new AppError('Requested quantity is not available', 400);
  const festivalId = parseFestivalId(existingCartItem.variant);
  if (festivalId) {
    const listing = await prisma.festivalProduct.findFirst({ where: {
      festivalId, productId: existingCartItem.productId, status: 'APPROVED', festival: { isActive: true, isPublished: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
    } });
    if (!listing || (listing.stock != null && listing.stock < quantity)) throw new AppError('This festival listing has insufficient stock', 400);
  }

  const updated = await prisma.cartItem.update({
    where: {
      id,
      userId: req.user!.userId,
    },
    data: {
      quantity,
    },
    include: {
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });

  const cart = await prisma.cartItem.findMany({ where: { userId: req.user!.userId }, include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } });
  const priced = await addCartPricing(req.user!.userId, cart);
  res.json({
    success: true,
    data: priced.items.find((item) => item.id === updated.id) || updated,
    pricing: priced.pricing,
  });
};

export const removeFromCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  await prisma.cartItem.delete({
    where: {
      id,
      userId: req.user!.userId,
    },
  });

  res.json({
    success: true,
    message: "Item removed from cart",
  });
};

export const clearCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  await prisma.cartItem.deleteMany({
    where: {
      userId: req.user!.userId,
    },
  });

  res.json({
    success: true,
    message: "Cart cleared",
  });
};

/* ===========================
   ADMIN CART MANAGEMENT
=========================== */

export const getAllCarts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const carts = await prisma.cartItem.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      product: {
        include: {
          images: {
            where: {
              isPrimary: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json({
    success: true,
    data: carts,
  });
};