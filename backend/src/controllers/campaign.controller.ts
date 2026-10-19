import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

function parseCampaign(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = typeof body.type === 'string' ? body.type.toUpperCase() : '';
  const value = Number(body.value);
  const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : new Date(NaN);
  const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : new Date(NaN);
  const minOrder = body.minOrder == null || body.minOrder === '' ? null : Number(body.minOrder);
  const maxDiscount = body.maxDiscount == null || body.maxDiscount === '' ? null : Number(body.maxDiscount);
  const usageLimit = body.usageLimit == null || body.usageLimit === '' ? null : Number(body.usageLimit);
  const perUserLimit = body.perUserLimit == null || body.perUserLimit === '' ? null : Number(body.perUserLimit);
  const ids = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];

  if (!name) throw new AppError('Campaign name is required', 400);
  if (!['PERCENTAGE', 'FIXED'].includes(type)) throw new AppError('Campaign type must be PERCENTAGE or FIXED', 400);
  if (!Number.isFinite(value) || value <= 0 || (type === 'PERCENTAGE' && value > 100)) throw new AppError('Invalid campaign value', 400);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new AppError('Campaign end date must be later than its valid start date', 400);
  if (minOrder != null && (!Number.isFinite(minOrder) || minOrder < 0)) throw new AppError('Minimum order must be non-negative', 400);
  if (maxDiscount != null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) throw new AppError('Maximum discount must be non-negative', 400);
  if (usageLimit != null && (!Number.isInteger(usageLimit) || usageLimit < 1)) throw new AppError('Usage limit must be a positive integer', 400);
  if (perUserLimit != null && (!Number.isInteger(perUserLimit) || perUserLimit < 1)) throw new AppError('Per-customer limit must be a positive integer', 400);

  return {
    name,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    type,
    value,
    minOrder,
    maxDiscount,
    startsAt,
    endsAt,
    usageLimit,
    perUserLimit,
    stackingAllowed: body.stackingAllowed === true,
    isActive: body.isActive === true,
    productIds: ids(body.productIds),
    categoryIds: ids(body.categoryIds),
  };
}

async function validateEligibility(productIds: string[], categoryIds: string[]) {
  const [products, categories] = await Promise.all([
    prisma.product.count({ where: { id: { in: productIds } } }),
    prisma.category.count({ where: { id: { in: categoryIds } } }),
  ]);
  if (products !== productIds.length || categories !== categoryIds.length) throw new AppError('One or more eligible products or categories do not exist', 400);
}

function displayStatus(campaign: { isActive: boolean; startsAt: Date; endsAt: Date }, now = new Date()) {
  if (!campaign.isActive) return 'PAUSED';
  if (now < campaign.startsAt) return 'SCHEDULED';
  if (now > campaign.endsAt) return 'EXPIRED';
  return 'ACTIVE';
}

export const listCampaigns = async (_req: AuthRequest, res: Response): Promise<void> => {
  const campaigns = await prisma.marketplaceCampaign.findMany({
    include: { products: { include: { product: { select: { id: true, name: true } } } }, categories: { include: { category: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: campaigns.map((campaign) => ({ ...campaign, displayStatus: displayStatus(campaign) })) });
};

export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = parseCampaign(req.body);
  await validateEligibility(input.productIds, input.categoryIds);
  const campaign = await prisma.marketplaceCampaign.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit,
      stackingAllowed: input.stackingAllowed,
      isActive: input.isActive,
      createdById: req.user!.userId,
      products: { create: input.productIds.map((productId) => ({ productId })) },
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
    include: { products: true, categories: true },
  });
  res.status(201).json({ success: true, data: { ...campaign, displayStatus: displayStatus(campaign) } });
};

export const updateCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.marketplaceCampaign.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Campaign not found', 404);
  const input = parseCampaign(req.body);
  await validateEligibility(input.productIds, input.categoryIds);
  const campaign = await prisma.marketplaceCampaign.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit,
      stackingAllowed: input.stackingAllowed,
      isActive: input.isActive,
      products: { deleteMany: {}, create: input.productIds.map((productId) => ({ productId })) },
      categories: { deleteMany: {}, create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
    include: { products: true, categories: true },
  });
  res.json({ success: true, data: { ...campaign, displayStatus: displayStatus(campaign) } });
};

export const toggleCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await prisma.marketplaceCampaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) throw new AppError('Campaign not found', 404);
  const updated = await prisma.marketplaceCampaign.update({ where: { id: campaign.id }, data: { isActive: !campaign.isActive } });
  res.json({ success: true, data: { ...updated, displayStatus: displayStatus(updated) } });
};

export const deleteCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await prisma.marketplaceCampaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) throw new AppError('Campaign not found', 404);
  await prisma.marketplaceCampaign.delete({ where: { id: campaign.id } });
  res.json({ success: true });
};