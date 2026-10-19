import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const validDate = (value: unknown, label: string) => {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new AppError(`${label} must be a valid date`, 400);
  }
  return new Date(value);
};

function getOfferStatus(offer: { status: string; startsAt: Date; endsAt: Date }, now = new Date()) {
  if (offer.status === 'PENDING_APPROVAL' || offer.status === 'REJECTED' || offer.status === 'SUSPENDED' || offer.status === 'WITHDRAWN') return offer.status;
  if (now < offer.startsAt) return 'SCHEDULED';
  if (now > offer.endsAt) return 'EXPIRED';
  return 'ACTIVE';
}

async function getPolicy() {
  return prisma.discountPolicy.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });
}

function parseOfferInput(body: Record<string, unknown>, basePrice: number, maximumPercent: number) {
  const discountPercent = body.discountPercent == null || body.discountPercent === '' ? null : Number(body.discountPercent);
  const salePrice = body.salePrice == null || body.salePrice === '' ? null : Number(body.salePrice);
  if (discountPercent == null && salePrice == null) throw new AppError('Enter a discount percentage or sale price', 400);
  if (discountPercent != null && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > maximumPercent)) {
    throw new AppError(`Discount must be greater than 0 and no more than ${maximumPercent}%`, 400);
  }
  if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= basePrice)) {
    throw new AppError('Sale price must be non-negative and below the original price', 400);
  }
  const calculated = discountPercent == null ? null : Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
  if (salePrice != null && calculated != null && Math.abs(salePrice - calculated) > 0.01) {
    throw new AppError('Sale price and discount percentage do not match', 400);
  }
  const startsAt = validDate(body.startsAt, 'Start date');
  const endsAt = validDate(body.endsAt, 'End date');
  if (endsAt <= startsAt) throw new AppError('End date must be later than start date', 400);
  return {
    discountPercent,
    salePrice: salePrice ?? calculated,
    startsAt,
    endsAt,
  };
}

export const listSellerOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  const offers = await prisma.sellerOffer.findMany({
    where: { sellerId: req.user!.userId },
    include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, history: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: offers.map((offer) => ({ ...offer, displayStatus: getOfferStatus(offer) })) });
};

export const createSellerOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findFirst({ where: { id: String(req.body.productId || ''), sellerId: req.user!.userId } });
  if (!product) throw new AppError('Product not found in your store', 404);
  const policy = await getPolicy();
  const input = parseOfferInput(req.body, product.basePrice, policy.maximumSellerDiscount);
  const overlap = await prisma.sellerOffer.findFirst({
    where: {
      productId: product.id,
      status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
  });
  if (overlap) throw new AppError('This product already has an offer during those dates', 409);
  const offer = await prisma.sellerOffer.create({
    data: {
      ...input,
      productId: product.id,
      sellerId: req.user!.userId,
      status: policy.sellerOffersRequireApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      history: { create: { actorId: req.user!.userId, action: 'SUBMITTED' } },
    },
    include: { product: true },
  });
  res.status(201).json({ success: true, data: { ...offer, displayStatus: getOfferStatus(offer) } });
};

export const updateSellerOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const offer = await prisma.sellerOffer.findFirst({
    where: { id: req.params.id, sellerId: req.user!.userId },
    include: { product: true },
  });
  if (!offer) throw new AppError('Offer not found', 404);
  if (offer.status === 'SUSPENDED') throw new AppError('Suspended offers cannot be edited', 409);
  const policy = await getPolicy();
  const input = parseOfferInput(req.body, offer.product.basePrice, policy.maximumSellerDiscount);
  const overlap = await prisma.sellerOffer.findFirst({
    where: {
      id: { not: offer.id },
      productId: offer.productId,
      status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
  });
  if (overlap) throw new AppError('This product already has an offer during those dates', 409);
  const updated = await prisma.sellerOffer.update({
    where: { id: offer.id },
    data: {
      ...input,
      status: policy.sellerOffersRequireApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
      history: { create: { actorId: req.user!.userId, action: 'UPDATED' } },
    },
    include: { product: true },
  });
  res.json({ success: true, data: { ...updated, displayStatus: getOfferStatus(updated) } });
};

export const deleteSellerOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const offer = await prisma.sellerOffer.findFirst({ where: { id: req.params.id, sellerId: req.user!.userId } });
  if (!offer) throw new AppError('Offer not found', 404);
  await prisma.sellerOffer.delete({ where: { id: offer.id } });
  res.json({ success: true });
};

export const getSellerOfferSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const [offers, items] = await Promise.all([
    prisma.sellerOffer.findMany({ where: { sellerId: req.user!.userId } }),
    prisma.orderItem.findMany({ where: { sellerId: req.user!.userId, offerId: { not: null } }, select: { offerId: true, quantity: true, price: true } }),
  ]);
  const byOffer = new Map<string, { unitsSold: number; revenue: number }>();
  for (const item of items) {
    if (!item.offerId) continue;
    const current = byOffer.get(item.offerId) || { unitsSold: 0, revenue: 0 };
    current.unitsSold += item.quantity;
    current.revenue += item.price * item.quantity;
    byOffer.set(item.offerId, current);
  }
  const statuses = offers.map((offer) => getOfferStatus(offer));
  res.json({
    success: true,
    data: {
      total: offers.length,
      active: statuses.filter((status) => status === 'ACTIVE').length,
      scheduled: statuses.filter((status) => status === 'SCHEDULED').length,
      pending: statuses.filter((status) => status === 'PENDING_APPROVAL').length,
      expired: statuses.filter((status) => status === 'EXPIRED').length,
      unitsSold: [...byOffer.values()].reduce((sum, item) => sum + item.unitsSold, 0),
      revenue: [...byOffer.values()].reduce((sum, item) => sum + item.revenue, 0),
      offers: offers.map((offer) => ({ ...offer, displayStatus: getOfferStatus(offer), ...(byOffer.get(offer.id) || { unitsSold: 0, revenue: 0 }) })),
    },
  });
};

export const listAdminOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  const offers = await prisma.sellerOffer.findMany({
    include: {
      seller: { select: { id: true, firstName: true, lastName: true, email: true } },
      product: { include: { category: true } },
      history: { include: { actor: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
  const filtered = offers.map((offer) => ({ ...offer, displayStatus: getOfferStatus(offer) }))
    .filter((offer) => !status || status === 'ALL' || offer.displayStatus === status);
  res.json({ success: true, data: filtered });
};

export const reviewSellerOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const action = String(req.body.action || '').toUpperCase();
  if (!['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE'].includes(action)) throw new AppError('Unsupported offer action', 400);
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (action === 'REJECT' && !reason) throw new AppError('A rejection reason is required', 400);
  const offer = await prisma.sellerOffer.findUnique({ where: { id: req.params.id } });
  if (!offer) throw new AppError('Offer not found', 404);
  if (action === 'APPROVE' && offer.status !== 'PENDING_APPROVAL') throw new AppError('Only pending offers can be approved', 409);
  if (action === 'REJECT' && offer.status !== 'PENDING_APPROVAL') throw new AppError('Only pending offers can be rejected', 409);
  if (action === 'SUSPEND' && offer.status !== 'APPROVED') throw new AppError('Only approved offers can be suspended', 409);
  if (action === 'REACTIVATE' && offer.status !== 'SUSPENDED') throw new AppError('Only suspended offers can be reactivated', 409);
  const status = action === 'APPROVE' || action === 'REACTIVATE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'SUSPENDED';
  const updated = await prisma.sellerOffer.update({
    where: { id: offer.id },
    data: {
      status,
      rejectionReason: action === 'REJECT' ? reason : null,
      reviewedById: req.user!.userId,
      reviewedAt: new Date(),
      history: { create: { actorId: req.user!.userId, action, reason: reason || null } },
    },
  });
  res.json({ success: true, data: { ...updated, displayStatus: getOfferStatus(updated) } });
};

export const deleteAdminOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const offer = await prisma.sellerOffer.findUnique({ where: { id: req.params.id } });
  if (!offer) throw new AppError('Offer not found', 404);
  await prisma.sellerOffer.delete({ where: { id: offer.id } });
  res.json({ success: true });
};

export const getOfferPolicy = async (_req: AuthRequest, res: Response): Promise<void> => {
  const policy = await getPolicy();
  res.json({ success: true, data: policy });
};

export const updateOfferPolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  if (typeof req.body.sellerOffersRequireApproval !== 'boolean') throw new AppError('Approval setting must be true or false', 400);
  const maximumSellerDiscount = Number(req.body.maximumSellerDiscount ?? 90);
  if (!Number.isFinite(maximumSellerDiscount) || maximumSellerDiscount <= 0 || maximumSellerDiscount > 100) {
    throw new AppError('Maximum seller discount must be greater than 0 and at most 100', 400);
  }
  const policy = await prisma.discountPolicy.upsert({
    where: { id: 'global' },
    update: { sellerOffersRequireApproval: req.body.sellerOffersRequireApproval, maximumSellerDiscount },
    create: { id: 'global', sellerOffersRequireApproval: req.body.sellerOffersRequireApproval, maximumSellerDiscount },
  });
  res.json({ success: true, data: policy });
};

export const getAdminOfferSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const [offers, campaigns, coupons, orderTotals, discountedOrders] = await Promise.all([
    prisma.sellerOffer.findMany({ select: { status: true, startsAt: true, endsAt: true } }),
    prisma.marketplaceCampaign.count({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.coupon.aggregate({ _sum: { usedCount: true } }),
    prisma.order.aggregate({ _sum: { discount: true } }),
    prisma.order.count({ where: { OR: [{ couponId: { not: null } }, { campaignId: { not: null } }, { discount: { gt: 0 } }] } }),
  ]);
  const statuses = offers.map((offer) => getOfferStatus(offer));
  res.json({
    success: true,
    data: {
      totalOffers: offers.length,
      pendingApprovals: statuses.filter((status) => status === 'PENDING_APPROVAL').length,
      activeOffers: statuses.filter((status) => status === 'ACTIVE').length,
      scheduledOffers: statuses.filter((status) => status === 'SCHEDULED').length,
      expiredOffers: statuses.filter((status) => status === 'EXPIRED').length,
      rejectedOffers: statuses.filter((status) => status === 'REJECTED').length,
      activeCampaigns: campaigns,
      couponUses: coupons._sum.usedCount || 0,
      totalDiscountsGranted: orderTotals._sum.discount || 0,
      ordersWithDiscounts: discountedOrders,
    },
  });
};

export const toggleSellerOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const offer = await prisma.sellerOffer.findFirst({ where: { id: req.params.id, sellerId: req.user!.userId } });
  if (!offer) throw new AppError('Offer not found', 404);
  if (!['APPROVED', 'WITHDRAWN'].includes(offer.status)) throw new AppError('Only approved or withdrawn offers can be activated or withdrawn', 409);
  const policy = await getPolicy();
  const action = offer.status === 'APPROVED' ? 'WITHDRAW' : 'REACTIVATE';
  const status = offer.status === 'APPROVED'
    ? 'WITHDRAWN'
    : policy.sellerOffersRequireApproval ? 'PENDING_APPROVAL' : 'APPROVED';
  const updated = await prisma.sellerOffer.update({
    where: { id: offer.id },
    data: {
      status,
      rejectionReason: null,
      reviewedById: null,
      reviewedAt: null,
      history: { create: { actorId: req.user!.userId, action } },
    },
  });
  res.json({ success: true, data: { ...updated, displayStatus: getOfferStatus(updated) } });
};