import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../middleware/error.middleware';

type Database = PrismaClient | Prisma.TransactionClient;

type PriceProduct = {
  id: string;
  categoryId: string | null;
  sellerId: string | null;
  basePrice: number;
  salePrice: number | null;
};

export type PricedCartLine = {
  productId: string;
  quantity: number;
  originalPrice: number;
  price: number;
  sellerDiscount: number;
  campaignDiscount: number;
  couponDiscount: number;
  offerId: string | null;
  campaignId: string | null;
};

export type CartPriceSummary = {
  lines: PricedCartLine[];
  originalSubtotal: number;
  subtotalBeforeCoupon: number;
  finalSubtotal: number;
  sellerDiscount: number;
  campaignDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  couponId: string | null;
  couponCode: string | null;
  campaignId: string | null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function discountAmount(type: string, value: number, price: number, maximum?: number | null) {
  const amount = type.toUpperCase() === 'PERCENTAGE' ? (price * value) / 100 : value;
  return roundMoney(Math.min(price, maximum == null ? amount : Math.min(amount, maximum)));
}

function campaignAppliesToProduct(
  campaign: { products: Array<{ productId: string }>; categories: Array<{ categoryId: string }> },
  product: PriceProduct
) {
  if (campaign.products.length === 0 && campaign.categories.length === 0) return true;
  return campaign.products.some((item) => item.productId === product.id) ||
    campaign.categories.some((item) => item.categoryId === product.categoryId);
}

function couponAppliesToProduct(
  coupon: { products: Array<{ productId: string }>; categories: Array<{ categoryId: string }> },
  product: PriceProduct
) {
  if (coupon.products.length === 0 && coupon.categories.length === 0) return true;
  return coupon.products.some((item) => item.productId === product.id) ||
    coupon.categories.some((item) => item.categoryId === product.categoryId);
}

async function userCanUseCampaign(
  db: Database,
  campaign: { id: string; perUserLimit: number | null; usageLimit: number | null; usedCount: number },
  userId?: string
) {
  if (campaign.usageLimit != null && campaign.usedCount >= campaign.usageLimit) return false;
  if (!userId || campaign.perUserLimit == null) return true;
  const used = await db.campaignUsage.count({ where: { campaignId: campaign.id, userId } });
  return used < campaign.perUserLimit;
}

async function userCanUseCoupon(db: Database, coupon: { id: string; perUserLimit: number | null }, userId?: string) {
  if (!userId || coupon.perUserLimit == null) return true;
  const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
  return used < coupon.perUserLimit;
}

export async function calculateCartPricing(
  items: Array<{ product: PriceProduct; quantity: number; festivalId?: string }>,
  options: { userId?: string; couponCode?: string; db?: Database; now?: Date } = {}
): Promise<CartPriceSummary> {
  const db = options.db || prisma;
  const now = options.now || new Date();
  if (items.length === 0) {
    return {
      lines: [], originalSubtotal: 0, subtotalBeforeCoupon: 0, finalSubtotal: 0,
      sellerDiscount: 0, campaignDiscount: 0, couponDiscount: 0, totalDiscount: 0,
      couponId: null, couponCode: null, campaignId: null,
    };
  }

  const productIds = items.map(({ product }) => product.id);
  const offers = await db.sellerOffer.findMany({
    where: {
      productId: { in: productIds },
      status: 'APPROVED',
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  });
  const festivalIds = Array.from(new Set(items.map((item) => item.festivalId).filter((id): id is string => Boolean(id))));
  const festivalListings = festivalIds.length ? await db.festivalProduct.findMany({
    where: {
      productId: { in: productIds },
      festivalId: { in: festivalIds },
      status: 'APPROVED',
      festival: { isActive: true, isPublished: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
  }) : [];
  const campaigns = await db.marketplaceCampaign.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { products: true, categories: true },
  });

  const baseLines = items.map(({ product, quantity, festivalId }) => {
    const eligibleOffers = offers.filter((offer) => offer.productId === product.id);
    const offerPrices = eligibleOffers.map((offer) => ({
      offer,
      price: offer.salePrice != null
        ? offer.salePrice
        : product.basePrice * (1 - (offer.discountPercent || 0) / 100),
    })).filter(({ price }) => price >= 0 && price < product.basePrice);
    const bestOffer = offerPrices.sort((a, b) => a.price - b.price)[0];
    const bestFestivalPrice = festivalListings
      .filter((listing) => listing.productId === product.id && listing.festivalId === festivalId)
      .map((listing) => listing.festivalPrice ?? (listing.discountPercent != null
        ? product.basePrice * (1 - listing.discountPercent / 100)
        : product.basePrice))
      .filter((price) => Number.isFinite(price) && price > 0 && price < product.basePrice)
      .sort((a, b) => a - b)[0];
    const legacySalePrice = product.sellerId == null && product.salePrice != null && product.salePrice >= 0 && product.salePrice < product.basePrice
      ? product.salePrice
      : product.basePrice;
    const sellerPrice = Math.min(bestOffer?.price ?? legacySalePrice, bestFestivalPrice ?? legacySalePrice);
    return {
      product,
      quantity,
      originalPrice: product.basePrice,
      sellerPrice: roundMoney(sellerPrice),
      sellerDiscount: roundMoney(product.basePrice - sellerPrice),
      offerId: bestOffer && bestOffer.price <= (bestFestivalPrice ?? Number.POSITIVE_INFINITY) ? bestOffer.offer.id : null,
      price: roundMoney(sellerPrice),
      campaignDiscount: 0,
      couponDiscount: 0,
      campaignId: null as string | null,
    };
  });

  const preCampaignSubtotal = baseLines.reduce((sum, line) => sum + line.sellerPrice * line.quantity, 0);
  const eligibleCampaigns = campaigns.filter((campaign) =>
    campaign.minOrder == null || preCampaignSubtotal >= campaign.minOrder
  );
  const usableCampaigns = await Promise.all(eligibleCampaigns.map(async (campaign) => ({
    campaign,
    usable: await userCanUseCampaign(db, campaign, options.userId),
  })));

  let selectedCampaign: (typeof campaigns)[number] | undefined;
  let selectedCampaignLines: typeof baseLines | undefined;
  let highestCampaignSaving = 0;

  for (const { campaign, usable } of usableCampaigns) {
    if (!usable) continue;
    const rawLines = baseLines.map((line) => {
      if (!campaignAppliesToProduct(campaign, line.product)) return { ...line, rawCampaignDiscount: 0, campaignBase: line.sellerPrice, resetsSellerDiscount: false };
      const campaignBase = campaign.stackingAllowed ? line.sellerPrice : line.originalPrice;
      const rawCampaignDiscount = discountAmount(campaign.type, campaign.value, campaignBase, campaign.maxDiscount);
      if (!campaign.stackingAllowed && campaignBase - rawCampaignDiscount >= line.sellerPrice) {
        return { ...line, rawCampaignDiscount: 0, campaignBase: line.sellerPrice, resetsSellerDiscount: false };
      }
      return { ...line, rawCampaignDiscount, campaignBase, resetsSellerDiscount: !campaign.stackingAllowed };
    });
    const rawTotal = rawLines.reduce((sum, line) => sum + line.rawCampaignDiscount * line.quantity, 0);
    const cappedTotal = campaign.maxDiscount == null ? rawTotal : Math.min(rawTotal, campaign.maxDiscount);
    if (cappedTotal <= highestCampaignSaving) continue;
    const scale = rawTotal > 0 ? cappedTotal / rawTotal : 0;
    const candidateLines = rawLines.map((line) => {
      const applied = roundMoney(line.rawCampaignDiscount * scale);
      const campaignPrice = roundMoney(Math.max(0, line.campaignBase - applied));
      if (line.resetsSellerDiscount && campaignPrice >= line.sellerPrice) {
        return {
          ...line,
          price: line.sellerPrice,
          campaignDiscount: 0,
          campaignId: null,
        };
      }
      return {
        ...line,
        price: campaignPrice,
        sellerDiscount: line.resetsSellerDiscount ? 0 : line.sellerDiscount,
        offerId: line.resetsSellerDiscount ? null : line.offerId,
        campaignDiscount: applied,
        campaignId: applied > 0 ? campaign.id : null,
      };
    });
    const actualSaving = baseLines.reduce(
      (sum, line, index) => sum + (line.sellerPrice - candidateLines[index].price) * line.quantity,
      0
    );
    if (actualSaving <= highestCampaignSaving) continue;
    selectedCampaignLines = candidateLines;
    selectedCampaign = campaign;
    highestCampaignSaving = actualSaving;
  }

  let lines = selectedCampaignLines || baseLines;
  const subtotalBeforeCoupon = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const originalSubtotal = lines.reduce((sum, line) => sum + line.originalPrice * line.quantity, 0);
  let couponId: string | null = null;
  let appliedCouponCode: string | null = null;

  if (options.couponCode) {
    const coupon = await db.coupon.findUnique({
      where: { code: options.couponCode.trim().toUpperCase() },
      include: { products: true, categories: true },
    });
    if (!coupon || !coupon.isActive) throw new AppError('Invalid coupon code', 400);
    if (coupon.startsAt && coupon.startsAt > now) throw new AppError('Coupon is not active yet', 400);
    if (coupon.expiresAt && coupon.expiresAt < now) throw new AppError('Coupon expired', 400);
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new AppError('Coupon usage limit reached', 400);
    if (!(await userCanUseCoupon(db, coupon, options.userId))) throw new AppError('Coupon usage limit reached for this account', 400);

    const eligibleLines = lines.filter((line) => couponAppliesToProduct(coupon, line.product));
    const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    if (coupon.minOrder != null && eligibleSubtotal < coupon.minOrder) throw new AppError(`Minimum eligible order is ${coupon.minOrder}`, 400);
    if (eligibleLines.length === 0) throw new AppError('Coupon does not apply to items in your cart', 400);

    const canStackCoupon = coupon.stackingAllowed && (!selectedCampaign || selectedCampaign.stackingAllowed);
    const rawDiscounts = eligibleLines.map((line) => {
      const basis = canStackCoupon ? line.price : line.originalPrice;
      return discountAmount(coupon.type, coupon.value, basis, coupon.maxDiscount);
    });
    const rawTotal = rawDiscounts.reduce((sum, amount, index) => sum + amount * eligibleLines[index].quantity, 0);
    const cappedTotal = coupon.maxDiscount == null ? rawTotal : Math.min(rawTotal, coupon.maxDiscount);
    const scale = rawTotal > 0 ? cappedTotal / rawTotal : 0;
    const discountByProduct = new Map(eligibleLines.map((line, index) => [line.product.id, roundMoney(rawDiscounts[index] * scale)]));

    lines = lines.map((line) => {
      const couponAmount = discountByProduct.get(line.product.id);
      if (couponAmount == null) return line;
      if (canStackCoupon) {
        const applied = Math.min(line.price, couponAmount);
        return { ...line, price: roundMoney(line.price - applied), couponDiscount: applied };
      }
      const couponOnlyPrice = Math.max(0, line.originalPrice - couponAmount);
      if (couponOnlyPrice >= line.price) return line;
      return {
        ...line,
        price: roundMoney(couponOnlyPrice),
        sellerDiscount: 0,
        campaignDiscount: 0,
        campaignId: null,
        offerId: null,
        couponDiscount: roundMoney(line.originalPrice - couponOnlyPrice),
      };
    });
    if (lines.reduce((sum, line) => sum + line.couponDiscount * line.quantity, 0) <= 0) {
      throw new AppError('Coupon does not reduce the price of eligible cart items', 400);
    }
    couponId = coupon.id;
    appliedCouponCode = coupon.code;
  }

  const pricedLines: PricedCartLine[] = lines.map((line) => ({
    productId: line.product.id,
    quantity: line.quantity,
    originalPrice: line.originalPrice,
    price: roundMoney(Math.max(0, line.price)),
    sellerDiscount: line.sellerDiscount,
    campaignDiscount: line.campaignDiscount,
    couponDiscount: line.couponDiscount,
    offerId: line.offerId,
    campaignId: line.campaignId,
  }));
  const finalSubtotal = roundMoney(pricedLines.reduce((sum, line) => sum + line.price * line.quantity, 0));
  const sellerDiscount = roundMoney(pricedLines.reduce((sum, line) => sum + line.sellerDiscount * line.quantity, 0));
  const campaignDiscount = roundMoney(pricedLines.reduce((sum, line) => sum + line.campaignDiscount * line.quantity, 0));
  const couponDiscount = roundMoney(pricedLines.reduce((sum, line) => sum + line.couponDiscount * line.quantity, 0));

  return {
    lines: pricedLines,
    originalSubtotal: roundMoney(originalSubtotal),
    subtotalBeforeCoupon: roundMoney(subtotalBeforeCoupon),
    finalSubtotal,
    sellerDiscount,
    campaignDiscount,
    couponDiscount,
    totalDiscount: roundMoney(originalSubtotal - finalSubtotal),
    couponId,
    couponCode: appliedCouponCode,
    campaignId: selectedCampaign?.id || null,
  };
}

export async function resolveProductPrices<T extends PriceProduct>(products: T[], db: Database = prisma, now = new Date()) {
  return Promise.all(products.map(async (product) => {
    const result = await calculateCartPricing([{ product, quantity: 1 }], { db, now });
    const pricing = result.lines[0];
    const percent = pricing.originalPrice > 0 ? Math.round((1 - pricing.price / pricing.originalPrice) * 100) : 0;
    return {
      ...product,
      salePrice: pricing.price < pricing.originalPrice ? pricing.price : null,
      priceBreakdown: {
        originalPrice: pricing.originalPrice,
        finalPrice: pricing.price,
        discountPercent: percent,
        sellerDiscount: pricing.sellerDiscount,
        campaignDiscount: pricing.campaignDiscount,
        offerId: pricing.offerId,
        campaignId: pricing.campaignId,
      },
    };
  }));
}
