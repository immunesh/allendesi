import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { calculateCartPricing } from '../services/pricing.service';

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ALL-${timestamp}-${random}`;
};

  const festivalIdFromVariant = (value: string | null): string | undefined => {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed?.festivalId === 'string' ? parsed.festivalId : undefined;
    } catch { return undefined; }
  };

  async function restoreFestivalInventory(orderId: string): Promise<void> {
    const items = await prisma.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true, variant: true } });
    for (const item of items) {
      const festivalId = festivalIdFromVariant(item.variant);
      await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      if (!festivalId) continue;
      const listing = await prisma.festivalProduct.findUnique({ where: { festivalId_productId: { festivalId, productId: item.productId } } });
      if (listing?.stock != null) await prisma.festivalProduct.update({ where: { id: listing.id }, data: { stock: { increment: item.quantity } } });
    }
  }

// Valid forward status transitions. SHIPPED is reachable only through the
// dedicated shipment endpoints, which enforce that an AWB has been assigned.
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: 'Order confirmed.',
  PROCESSING: 'Order is being processed.',
  OUT_FOR_DELIVERY: 'Order is out for delivery.',
  DELIVERED: 'Order delivered successfully.',
  CANCELLED: 'Order cancelled by admin.',
};

const validateShipmentPayload = (body: Record<string, unknown>) => {
  const courier = typeof body.courier === 'string' ? body.courier.trim() : '';
  const awbNumber = typeof body.awbNumber === 'string' ? body.awbNumber.trim() : '';
  const trackingUrl = typeof body.trackingUrl === 'string' ? body.trackingUrl.trim() : '';
  const estimatedDelivery = body.estimatedDelivery as string | undefined;

  if (!courier) throw new AppError('Courier is required', 400);
  if (!awbNumber) throw new AppError('AWB / Tracking number is required', 400);
  if (!estimatedDelivery || isNaN(new Date(estimatedDelivery).getTime())) {
    throw new AppError('A valid estimated delivery date is required', 400);
  }
  if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
    throw new AppError('Tracking URL must be a valid http/https URL', 400);
  }

  return { courier, awbNumber, trackingUrl: trackingUrl || null, estimatedDelivery: new Date(estimatedDelivery) };
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { addressId, paymentMethod, couponCode, notes } = req.body;
  const userId = req.user!.userId;
  const order = await prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new AppError('Address not found', 404);
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });
    if (!cartItems.length) throw new AppError('Cart is empty', 400);
    const now = new Date();
    for (const item of cartItems) {
      if (!item.product.isActive || item.quantity < 1 || item.quantity > item.product.stock) {
        throw new AppError(`${item.product.name} no longer has enough stock`, 409);
      }
      const festivalId = festivalIdFromVariant(item.variant);
      if (festivalId) {
        const listing = await tx.festivalProduct.findFirst({ where: {
          festivalId, productId: item.productId, status: 'APPROVED',
          festival: { isActive: true, isPublished: true, startsAt: { lte: now }, endsAt: { gte: now } },
        } });
        if (!listing || (listing.stock != null && item.quantity > listing.stock)) throw new AppError(`${item.product.name} is no longer available in this festival`, 409);
        if (listing.stock != null) {
          const reserved = await tx.festivalProduct.updateMany({ where: { id: listing.id, status: 'APPROVED', stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (reserved.count !== 1) throw new AppError(`${item.product.name} festival stock just sold out`, 409);
        }
      }
      const reservedProduct = await tx.product.updateMany({ where: { id: item.productId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      if (reservedProduct.count !== 1) throw new AppError(`${item.product.name} just sold out`, 409);
    }
    const pricing = await calculateCartPricing(
      cartItems.map((item) => ({ product: item.product, quantity: item.quantity, festivalId: festivalIdFromVariant(item.variant) })),
      { userId, couponCode: typeof couponCode === 'string' && couponCode.trim() ? couponCode : undefined, db: tx }
    );
    const lineByProduct = new Map(pricing.lines.map((line) => [line.productId, line]));
    const shipping = pricing.finalSubtotal >= 999 ? 0 : 99;
    const tax = Math.round(pricing.finalSubtotal * 0.18 * 100) / 100;
    const total = Math.max(0, pricing.finalSubtotal + shipping + tax);
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        paymentMethod,
        subtotal: pricing.originalSubtotal,
        discount: pricing.totalDiscount,
        shipping,
        tax,
        total,
        couponCode: pricing.couponCode,
        couponId: pricing.couponId,
        campaignId: pricing.campaignId,
        notes,
        tracking: { create: { status: 'PENDING', message: 'Order placed successfully.' } },
      },
    });

    await tx.orderItem.createMany({
      data: cartItems.map((item) => {
        const line = lineByProduct.get(item.productId)!;
        return {
          orderId: created.id,
          productId: item.productId,
          sellerId: item.product.sellerId,
          offerId: line.offerId,
          campaignId: line.campaignId,
          name: item.product.name,
          image: item.product.images[0]?.url ?? null,
          quantity: item.quantity,
          price: line.price,
          originalPrice: line.originalPrice,
          sellerDiscount: line.sellerDiscount,
          campaignDiscount: line.campaignDiscount,
          couponDiscount: line.couponDiscount,
          variant: item.variant,
        };
      }),
    });

    if (pricing.couponId) {
      const coupon = await tx.coupon.findUnique({ where: { id: pricing.couponId } });
      const now = new Date();
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
        throw new AppError('Coupon is no longer valid', 409);
      }
      const consumed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          ...(coupon.usageLimit == null ? {} : { usedCount: { lt: coupon.usageLimit } }),
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          ],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (consumed.count !== 1) throw new AppError('Coupon usage limit reached', 409);
      if (coupon.perUserLimit != null) {
        const userUses = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
        if (userUses >= coupon.perUserLimit) throw new AppError('Coupon usage limit reached for this account', 409);
      }
      await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId: created.id, discount: pricing.couponDiscount } });
    }

    if (pricing.campaignId) {
      const campaign = await tx.marketplaceCampaign.findUnique({ where: { id: pricing.campaignId } });
      const now = new Date();
      if (!campaign || !campaign.isActive || campaign.startsAt > now || campaign.endsAt < now) {
        throw new AppError('Campaign is no longer active', 409);
      }
      const consumed = await tx.marketplaceCampaign.updateMany({
        where: {
          id: campaign.id,
          isActive: true,
          startsAt: { lte: now },
          endsAt: { gte: now },
          ...(campaign.usageLimit == null ? {} : { usedCount: { lt: campaign.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (consumed.count !== 1) throw new AppError('Campaign usage limit reached', 409);
      if (campaign.perUserLimit != null) {
        const userUses = await tx.campaignUsage.count({ where: { campaignId: campaign.id, userId } });
        if (userUses >= campaign.perUserLimit) throw new AppError('Campaign usage limit reached for this account', 409);
      }
      await tx.campaignUsage.create({ data: { campaignId: campaign.id, userId, orderId: created.id, discount: pricing.campaignDiscount } });
    }

    await tx.cartItem.deleteMany({ where: { userId } });
    return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true, address: true, tracking: true } });
  });
  res.status(201).json({ success: true, data: order });
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: req.user!.userId },
      include: { items: true, address: true },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.order.count({ where: { userId: req.user!.userId } }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderNumber: id }], userId: req.user!.userId },
    include: { items: true, address: true, tracking: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, data: order });
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const order = await prisma.order.findFirst({ where: { id, userId: req.user!.userId } });
  if (!order) throw new AppError('Order not found', 404);
  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }
  await prisma.order.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      tracking: { create: { status: 'CANCELLED', message: 'Order cancelled by customer.' } },
    },
  });
  await restoreFestivalInventory(id);
  res.json({ success: true, message: 'Order cancelled successfully' });
};

export const getAdminOrders = async (
req: AuthRequest,
res: Response
): Promise<void> => {
const orders = await prisma.order.findMany({
include: {
user: {
select: {
firstName: true,
lastName: true,
email: true,
},
},
items: true,
},
orderBy: {
createdAt: "desc",
},
});

res.json({
success: true,
data: orders,
});
};

export const getAdminOrderById = async (
req: AuthRequest,
res: Response
): Promise<void> => {
const { id } = req.params;

const order = await prisma.order.findUnique({
where: {
id,
},
include: {
user: true,
address: true,
items: true,
tracking: {
orderBy: {
createdAt: "desc",
},
},
},
});

if (!order) {
throw new AppError(
"Order not found",
404
);
}

res.json({
success: true,
data: order,
});
};

export const updateSellerOrderDecision = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['CONFIRMED', 'CANCELLED', 'DELIVERED'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError('Seller update must be CONFIRMED, CANCELLED or DELIVERED', 400);
    }

    const existing = await prisma.order.findFirst({
      where: { id, items: { some: { sellerId: req.user!.userId } } },
    });

    if (!existing) throw new AppError('Order not found', 404);

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DELIVERED', 'CANCELLED'],
      PROCESSING: ['DELIVERED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    };

    const allowedTransition = validTransitions[existing.status] || [];
    if (!allowedTransition.includes(status)) {
      throw new AppError(`Cannot change status from ${existing.status} to ${status} as a seller`, 400);
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        deliveredAt: status === 'DELIVERED' ? new Date() : existing.deliveredAt,
        tracking: {
          create: {
            status,
            message:
              status === 'CONFIRMED'
                ? 'Order accepted by seller.'
                : status === 'DELIVERED'
                ? 'Order delivered by seller.'
                : 'Order cancelled by seller.',
          },
        },
      },
      include: { items: true, address: true, tracking: { orderBy: { createdAt: 'desc' } } },
    });
    if (status === 'CANCELLED') await restoreFestivalInventory(id);

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Failed to update seller order decision:', error);
    res.status(500).json({ success: false, message: 'Failed to update seller order decision' });
  }
};

export const updateOrderStatus = async (
req: AuthRequest,
res: Response
): Promise<void> => {
try {

const { id } = req.params;
const { status } = req.body;

const existing = await prisma.order.findUnique({ where: { id } });
if (!existing) throw new AppError('Order not found', 404);

if (status === existing.status) {
  res.json({ success: true, data: existing });
  return;
}

if (status === 'SHIPPED') {
  throw new AppError('Use the Ship Order action to mark an order as shipped', 400);
}

const allowedNext = ALLOWED_STATUS_TRANSITIONS[existing.status] || [];
if (!allowedNext.includes(status)) {
  throw new AppError(`Cannot change status from ${existing.status} to ${status}`, 400);
}

const order = await prisma.order.update({
  where: { id },
  data: {
    status,
    deliveredAt: status === 'DELIVERED' ? new Date() : existing.deliveredAt,
    tracking: {
      create: {
        status,
        message: STATUS_MESSAGES[status] || `Order status updated to ${status}`,
      },
    },
  },
  include: { items: true, address: true, tracking: { orderBy: { createdAt: 'desc' } } },
});
if (status === 'CANCELLED') await restoreFestivalInventory(id);

res.json({
success: true,
data: order,
});
} catch (error) {
if (error instanceof AppError) {
res.status(error.statusCode).json({ success: false, message: error.message });
return;
}
console.error('Failed to update order status:', error);
res.status(500).json({ success: false, message: 'Failed to update order status' });
}
};

export const createShipment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    if (existing.status !== 'PROCESSING') {
      throw new AppError('Order must be in Processing status before it can be shipped', 400);
    }

    const { courier, awbNumber, trackingUrl, estimatedDelivery } = validateShipmentPayload(req.body);
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        courier,
        awbNumber,
        trackingUrl,
        estimatedDelivery,
        shipmentNotes: notes || null,
        shippedAt: new Date(),
        tracking: {
          create: {
            status: 'SHIPPED',
            message: `Order shipped via ${courier}. AWB: ${awbNumber}`,
          },
        },
      },
      include: { items: true, address: true, tracking: { orderBy: { createdAt: 'desc' } } },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Failed to create shipment:', error);
    res.status(500).json({ success: false, message: 'Failed to create shipment' });
  }
};

export const updateShipment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    if (!existing.awbNumber) {
      throw new AppError('Shipment has not been created for this order yet', 400);
    }

    const { courier, awbNumber, trackingUrl, estimatedDelivery } = validateShipmentPayload(req.body);
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';

    const order = await prisma.order.update({
      where: { id },
      data: {
        courier,
        awbNumber,
        trackingUrl,
        estimatedDelivery,
        shipmentNotes: notes || null,
        tracking: {
          create: {
            status: existing.status,
            message: `Shipment details updated. Courier: ${courier}, AWB: ${awbNumber}`,
          },
        },
      },
      include: { items: true, address: true, tracking: { orderBy: { createdAt: 'desc' } } },
    });

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Failed to update shipment:', error);
    res.status(500).json({ success: false, message: 'Failed to update shipment' });
  }
};

export const getSellerOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const orders = await prisma.order.findMany({
    where: {
      items: { some: { sellerId: req.user!.userId } },
      status: {
        in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      },
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        where: { sellerId: req.user!.userId },
        include: {
          product: true,
        },
      },
      address: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: orders,
  });
};