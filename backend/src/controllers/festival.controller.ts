import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const statusOf = (festival: { isActive: boolean; startsAt: Date; endsAt: Date }, now = new Date()) => {
  if (!festival.isActive) return 'INACTIVE';
  if (now < festival.startsAt) return 'UPCOMING';
  if (now > festival.endsAt) return 'ENDED';
  return 'ACTIVE';
};

function parseFestival(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(name);
  const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : new Date(NaN);
  const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : new Date(NaN);
  if (!name || !slug) throw new AppError('Festival name and URL slug are required', 400);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new AppError('Festival end date must follow a valid start date', 400);
  const text = (value: unknown) => typeof value === 'string' ? value.trim() || null : null;
  return {
    name, slug, startsAt, endsAt,
    description: text(body.description),
    bannerImage: text(body.bannerImage),
    thumbnail: text(body.thumbnail),
    pageTitle: text(body.pageTitle),
    promotionalText: text(body.promotionalText),
    pageBanner: text(body.pageBanner),
    isFeatured: body.isFeatured === true,
    isActive: body.isActive !== false,
    isPublished: body.isPublished === true,
    approvalEnabled: body.approvalEnabled !== false,
  };
}

const assignmentInclude = {
  product: { include: { images: { orderBy: { isPrimary: 'desc' as const } }, category: true } },
  seller: { select: { id: true, firstName: true, lastName: true, email: true } },
};
const parseFestivalId = (value: string | null): string | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.festivalId === 'string' ? parsed.festivalId : null;
  } catch { return null; }
};

export const publicFestivals = async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const festivals = await prisma.festival.findMany({
    where: { isActive: true, isPublished: true, endsAt: { gte: now } },
    orderBy: [{ isFeatured: 'desc' }, { startsAt: 'asc' }],
    include: { _count: { select: { products: { where: { status: 'APPROVED', product: { isActive: true } } } } } },
  });
  res.json({ success: true, data: festivals.map((festival) => ({ ...festival, status: statusOf(festival) })) });
};

export const publicFestivalBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const festival = await prisma.festival.findFirst({
    where: { slug: req.params.slug, isActive: true, isPublished: true, endsAt: { gte: now } },
    include: {
      products: {
        where: { status: 'APPROVED', product: { isActive: true, stock: { gt: 0 } } },
        include: { product: { include: { images: { orderBy: { isPrimary: 'desc' } }, category: true } } },
      },
    },
  });
  if (!festival) throw new AppError('Festival not found', 404);
  const products = festival.products.map((assignment) => ({
    ...assignment.product,
    festivalListing: {
      id: assignment.id,
      festivalId: festival.id,
      price: assignment.festivalPrice,
      discountPercent: assignment.discountPercent,
      promotionalDescription: assignment.promotionalDescription,
      stock: Math.min(assignment.product.stock, assignment.stock ?? assignment.product.stock),
    },
  })).filter((product) => product.festivalListing.stock > 0);
  res.json({ success: true, data: { ...festival, products, status: statusOf(festival) } });
};

export const adminPreviewFestival = async (req: AuthRequest, res: Response): Promise<void> => {
  const festival = await prisma.festival.findUnique({
    where: { slug: req.params.slug },
    include: { products: { where: { status: { not: 'REJECTED' }, product: { isActive: true, stock: { gt: 0 } }, }, include: { product: { include: { images: { orderBy: { isPrimary: 'desc' } }, category: true } } } } },
  });
  if (!festival) throw new AppError('Festival not found', 404);
  const products = festival.products.map((assignment) => ({
    ...assignment.product,
    festivalListing: {
      id: assignment.id,
      festivalId: festival.id,
      price: assignment.festivalPrice,
      discountPercent: assignment.discountPercent,
      promotionalDescription: assignment.promotionalDescription,
      stock: Math.min(assignment.product.stock, assignment.stock ?? assignment.product.stock),
    },
  })).filter((product) => product.festivalListing.stock > 0);
  res.json({ success: true, data: { ...festival, products, status: statusOf(festival), preview: true } });
};

export const adminFestivals = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const now = new Date();
  const where: Record<string, any> = search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {};
  if (status === 'ACTIVE') Object.assign(where, { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } });
  if (status === 'UPCOMING') Object.assign(where, { isActive: true, startsAt: { gt: now } });
  if (status === 'INACTIVE') where.isActive = false;
  const [festivals, total] = await Promise.all([
    prisma.festival.findMany({ where, include: { products: { include: assignmentInclude }, _count: { select: { products: true } } }, orderBy: { startsAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.festival.count({ where }),
  ]);
  res.json({ success: true, data: festivals.map((festival) => ({ ...festival, status: statusOf(festival) })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

export const festivalStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const [total, active, upcoming, assignments, pending, productIds] = await Promise.all([
    prisma.festival.count(),
    prisma.festival.count({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.festival.count({ where: { isActive: true, startsAt: { gt: now } } }),
    prisma.festivalProduct.count(),
    prisma.festivalProduct.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.festivalProduct.findMany({ select: { productId: true } }).then((rows) => Array.from(new Set(rows.map((row) => row.productId)))),
  ]);
  const salesItems = productIds.length ? await prisma.orderItem.findMany({ where: { productId: { in: productIds }, variant: { contains: 'festivalId' }, order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }, select: { orderId: true, price: true, quantity: true, variant: true } }) : [];
  const festivalSales = new Map<string, number>();
  const festivalOrders = new Map<string, Set<string>>();
  const uniqueOrders = new Set<string>();
  for (const item of salesItems) {
    const festivalId = parseFestivalId(item.variant);
    if (!festivalId) continue;
    festivalSales.set(festivalId, (festivalSales.get(festivalId) || 0) + item.price * item.quantity);
    uniqueOrders.add(item.orderId);
    if (!festivalOrders.has(festivalId)) festivalOrders.set(festivalId, new Set());
    festivalOrders.get(festivalId)!.add(item.orderId);
  }
  res.json({ success: true, data: {
    total, active, upcoming, assignments, pending,
    sales: Array.from(festivalSales.values()).reduce((sum, value) => sum + value, 0),
    orders: uniqueOrders.size,
    bestPerforming: Array.from(festivalSales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([festivalId, amount]) => ({ festivalId, amount, orders: festivalOrders.get(festivalId)?.size || 0 })),
  } });
};

export const createFestival = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = parseFestival(req.body);
  if (await prisma.festival.findUnique({ where: { slug: data.slug } })) throw new AppError('That festival URL slug is already in use', 409);
  const festival = await prisma.festival.create({ data });
  res.status(201).json({ success: true, data: { ...festival, status: statusOf(festival) } });
};

export const updateFestival = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.festival.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Festival not found', 404);
  const data = parseFestival(req.body);
  const duplicate = await prisma.festival.findFirst({ where: { slug: data.slug, id: { not: existing.id } } });
  if (duplicate) throw new AppError('That festival URL slug is already in use', 409);
  const festival = await prisma.festival.update({ where: { id: existing.id }, data });
  res.json({ success: true, data: { ...festival, status: statusOf(festival) } });
};

export const deleteFestival = async (req: AuthRequest, res: Response): Promise<void> => {
  const festival = await prisma.festival.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
  if (!festival) throw new AppError('Festival not found', 404);
  await prisma.festival.delete({ where: { id: festival.id } });
  res.json({ success: true, removedAssignments: festival._count.products });
};

export const reviewFestivalProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const status = typeof req.body.status === 'string' ? req.body.status.toUpperCase() : '';
  if (!['APPROVED', 'REJECTED', 'UNPUBLISHED'].includes(status)) throw new AppError('Invalid festival product status', 400);
  const assignment = await prisma.festivalProduct.findUnique({ where: { id: req.params.assignmentId } });
  if (!assignment) throw new AppError('Festival product not found', 404);
  const updated = await prisma.festivalProduct.update({ where: { id: assignment.id }, data: { status } });
  res.json({ success: true, data: updated });
};

export const sellerFestivals = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const festivals = await prisma.festival.findMany({
    where: { isActive: true, endsAt: { gte: now } },
    include: { products: { where: { sellerId: _req.user!.userId }, include: { product: { select: { id: true, name: true } } } } },
    orderBy: { startsAt: 'asc' },
  });
  res.json({ success: true, data: festivals.map((festival) => ({ ...festival, status: statusOf(festival), acceptingProducts: festival.isActive && festival.endsAt >= now })) });
};

export const createFestivalProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const festival = await prisma.festival.findFirst({ where: { id: req.params.festivalId, isActive: true, endsAt: { gte: new Date() } } });
  if (!festival) throw new AppError('Festival is not accepting products', 400);
  const body = req.body as Record<string, any>;
  const basePrice = Number(body.basePrice);
  const festivalPrice = body.festivalPrice == null || body.festivalPrice === '' ? null : Number(body.festivalPrice);
  const discountPercent = body.discountPercent == null || body.discountPercent === '' ? null : Number(body.discountPercent);
  const stock = body.stock == null || body.stock === '' ? null : Number(body.stock);
  if (festivalPrice != null && (!Number.isFinite(festivalPrice) || festivalPrice <= 0)) throw new AppError('Festival price must be positive', 400);
  if (discountPercent != null && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 90)) throw new AppError('Festival discount must be between 0 and 90 percent', 400);
  if (stock != null && (!Number.isInteger(stock) || stock < 0)) throw new AppError('Festival stock must be a non-negative whole number', 400);
  const imageUrls = Array.isArray(body.images) ? body.images.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0) : [];
  const assignment = await prisma.$transaction(async (tx) => {
    let productId = typeof body.productId === 'string' ? body.productId : '';
    if (productId) {
      const product = await tx.product.findFirst({ where: { id: productId, sellerId }, select: { id: true, basePrice: true } });
      if (!product) throw new AppError('Product not found or not owned by this seller', 403);
      if (festivalPrice != null && festivalPrice >= product.basePrice) throw new AppError('Festival price must be below the original price', 400);
      const existingAssignment = await tx.festivalProduct.findUnique({ where: { festivalId_productId: { festivalId: festival.id, productId } } });
      if (existingAssignment) throw new AppError('This product is already assigned to the festival', 409);
    } else {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      if (!name || !description || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isInteger(Number(body.stock)) || Number(body.stock) < 0) throw new AppError('Product name, description, valid price and stock are required', 400);
      if (festivalPrice != null && festivalPrice >= basePrice) throw new AppError('Festival price must be below the original price', 400);
      const slug = `${slugify(name)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const product = await tx.product.create({ data: {
        name, slug, description, shortDesc: typeof body.promotionalDescription === 'string' ? body.promotionalDescription : description,
        categoryId: null, gender: 'UNISEX', basePrice, stock: Number(body.stock), sku: `FEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        brand: typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim() : 'Allendesi', sellerId,
        images: { create: imageUrls.map((url: string, index: number) => ({ url, isPrimary: index === 0 })) },
      } });
      productId = product.id;
    }
    return tx.festivalProduct.create({ data: {
      festivalId: festival.id, productId, sellerId,
      status: festival.approvalEnabled ? 'PENDING_APPROVAL' : 'APPROVED',
      festivalPrice, discountPercent, stock,
      promotionalDescription: typeof body.promotionalDescription === 'string' ? body.promotionalDescription.trim() || null : null,
    }, include: assignmentInclude });
  });
  res.status(201).json({ success: true, data: assignment });
};

export const sellerFestivalAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  const assignments = await prisma.festivalProduct.findMany({ where: { sellerId: req.user!.userId }, include: { festival: true, ...assignmentInclude }, orderBy: { updatedAt: 'desc' } });
  res.json({ success: true, data: assignments });
};

export const sellerFestivalStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const assignments = await prisma.festivalProduct.findMany({ where: { sellerId }, select: { productId: true, festivalId: true, status: true, festival: { select: { isActive: true, endsAt: true } } } });
  const productIds = Array.from(new Set(assignments.map((item) => item.productId)));
  const items = productIds.length ? await prisma.orderItem.findMany({ where: { sellerId, productId: { in: productIds }, variant: { contains: 'festivalId' }, order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }, select: { orderId: true, productId: true, price: true, quantity: true, variant: true } }) : [];
  const validFestivalIds = new Set(assignments.map((item) => item.festivalId));
  const salesByFestival = new Map<string, number>();
  const ordersByFestival = new Map<string, Set<string>>();
  const salesByProduct = new Map<string, number>();
  const uniqueOrders = new Set<string>();
  for (const item of items) {
    const festivalId = parseFestivalId(item.variant);
    if (!festivalId || !validFestivalIds.has(festivalId)) continue;
    const amount = item.price * item.quantity;
    salesByFestival.set(festivalId, (salesByFestival.get(festivalId) || 0) + amount);
    salesByProduct.set(item.productId, (salesByProduct.get(item.productId) || 0) + amount);
    uniqueOrders.add(item.orderId);
    if (!ordersByFestival.has(festivalId)) ordersByFestival.set(festivalId, new Set());
    ordersByFestival.get(festivalId)!.add(item.orderId);
  }
  const now = new Date();
  res.json({ success: true, data: {
    assignments: assignments.length,
    pending: assignments.filter((item) => item.status === 'PENDING_APPROVAL').length,
    active: assignments.filter((item) => item.festival.isActive && item.festival.endsAt >= now).length,
    sales: Array.from(salesByFestival.values()).reduce((sum, amount) => sum + amount, 0),
    orders: uniqueOrders.size,
    bestProducts: Array.from(salesByProduct.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([productId, amount]) => ({ productId, amount })),
  } });
};

export const updateSellerFestivalProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const assignment = await prisma.festivalProduct.findFirst({ where: { id: req.params.assignmentId, sellerId: req.user!.userId } });
  if (!assignment) throw new AppError('Festival product not found or not owned by this seller', 404);
  const festivalPrice = req.body.festivalPrice == null || req.body.festivalPrice === '' ? null : Number(req.body.festivalPrice);
  const discountPercent = req.body.discountPercent == null || req.body.discountPercent === '' ? null : Number(req.body.discountPercent);
  const stock = req.body.stock == null || req.body.stock === '' ? null : Number(req.body.stock);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: assignment.productId }, select: { basePrice: true } });
  if (festivalPrice != null && (!Number.isFinite(festivalPrice) || festivalPrice <= 0 || festivalPrice >= product.basePrice)) throw new AppError('Festival price must be positive and below the original price', 400);
  if (discountPercent != null && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 90)) throw new AppError('Festival discount must be between 0 and 90 percent', 400);
  if (stock != null && (!Number.isInteger(stock) || stock < 0)) throw new AppError('Festival stock must be a non-negative whole number', 400);
  const updated = await prisma.festivalProduct.update({ where: { id: assignment.id }, data: {
    festivalPrice, discountPercent, stock,
    promotionalDescription: typeof req.body.promotionalDescription === 'string' ? req.body.promotionalDescription.trim() || null : assignment.promotionalDescription,
  }, include: { festival: true, ...assignmentInclude } });
  res.json({ success: true, data: updated });
};

export const deleteSellerFestivalProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await prisma.festivalProduct.deleteMany({ where: { id: req.params.assignmentId, sellerId: req.user!.userId } });
  if (!result.count) throw new AppError('Festival product not found or not owned by this seller', 404);
  res.json({ success: true });
};