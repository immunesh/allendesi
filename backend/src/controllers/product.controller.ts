import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/error.middleware";
import { AuthRequest } from "../middleware/auth.middleware";
import { resolveProductPrices } from "../services/pricing.service";
import { ALLENDESI_CATEGORIES, isAllendesiCategory } from "../constants/categories";

const INVALID_CATEGORY_MESSAGE =
  "Invalid category. Please select a valid Allendesi category.";

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    page = "1",
    limit = "12",
    gender,
    category,
    minPrice,
    maxPrice,
    sort = "createdAt",
    order = "desc",
    featured,
    bestSeller,
    newArrival,
    search,
     images,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, any> = {
    isActive: true,
    categoryId: { not: null },
  };

  if (gender) where.gender = (gender as string).toUpperCase();
  if (featured === "true") where.isFeatured = true;
  if (bestSeller === "true") where.isBestSeller = true;
  if (newArrival === "true") where.isNewArrival = true;
  if (category) where.category = { slug: category };

  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { description: { contains: search as string } },
      { tags: { contains: search as string } },
    ];
  }

  if (minPrice || maxPrice) {
    where.basePrice = {};

    if (minPrice) {
      where.basePrice.gte = parseFloat(
        minPrice as string
      );
    }

    if (maxPrice) {
      where.basePrice.lte = parseFloat(
        maxPrice as string
      );
    }
  }

  const orderBy: Record<string, string> = {};
  orderBy[sort as string] = order as string;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
    include: {
  images: true,

  category: {
    select: {
      name: true,
      slug: true,
    },
  },

  variants: true,
  includedItems: true,
  faqs: true,
  careGuides: true,
  features: true,
  highlights: true,
},
      skip,
      take: limitNum,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  const parsed = products.map((p) => ({
    ...p,
    tags: safeParseJson(p.tags, []),
  }));
  const priced = await resolveProductPrices(parsed);

  res.json({
    success: true,
    data: priced,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      isActive: true,
    },

    include: {
      images: {
        orderBy: {
          angle: "asc",
        },
      },
       includedItems: true,
       faqs: true,
       careGuides: true,
      category: true,
      variants: true,
      highlights: true,
        features: true,
      reviews: {

        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const [pricedProduct] = await resolveProductPrices([{
    ...product,
    tags: safeParseJson(product.tags, []),
    reviews: product.reviews.map((review) => ({ ...review, images: safeParseJson(review.images, []) })),
  }]);

  res.json({
    success: true,
    data: pricedProduct,
  });
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
      slug: { in: ALLENDESI_CATEGORIES.map(({ slug }) => slug) },
    },
  });

  const orderedCategories = ALLENDESI_CATEGORIES.flatMap((allowed) => {
    const category = categories.find((item) => item.slug === allowed.slug);
    return category ? [category] : [];
  });

  res.json({
    success: true,
    data: orderedCategories,
  });
};

export const getFeaturedProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const products = await prisma.product.findMany({
    where: {
      isFeatured: true,
      isActive: true,
    },
    include: {
      images: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
    },
    take: 8,
  });

  const parsed = products.map((product) => ({ ...product, tags: safeParseJson(product.tags, []) }));
  const priced = await resolveProductPrices(parsed);
  res.json({
    success: true,
    data: priced,
  });
};

export const getSellerProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.user!.userId },
    include: {
      images: true,
      category: { select: { id: true, name: true, slug: true } },
      sellerOffers: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: products.map((product) => ({ ...product, tags: safeParseJson(product.tags, []) })) });
};

export const assignProductToSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  const sellerId = typeof req.body.sellerId === 'string' ? req.body.sellerId.trim() : '';
  if (!sellerId) throw new AppError('A seller must be selected', 400);

  const product = await prisma.$transaction(async (tx) => {
    const existingProduct = await tx.product.findUnique({
      where: { id: req.params.id },
      select: { id: true, sellerId: true },
    });
    if (!existingProduct) throw new AppError('Product not found', 404);

    const seller = await tx.user.findUnique({
      where: { id: sellerId },
      select: { id: true, role: true },
    });
    if (!seller || seller.role !== 'SELLER') throw new AppError('Selected account is not a seller', 400);

    if (existingProduct.sellerId && existingProduct.sellerId !== seller.id) {
      throw new AppError('Product is already assigned to another seller', 409);
    }

    if (!existingProduct.sellerId) {
      const assigned = await tx.product.updateMany({
        where: { id: existingProduct.id, sellerId: null },
        data: { sellerId: seller.id },
      });
      if (assigned.count !== 1) throw new AppError('Product ownership changed; reload and try again', 409);
    }

    return tx.product.findUniqueOrThrow({
      where: { id: existingProduct.id },
      include: { seller: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  });

  res.json({ success: true, data: product });
};

export const getRelatedProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      gender: product.gender,
      id: {
        not: id,
      },
      isActive: true,
    },
    include: {
      images: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
    },
    take: 6,
  });

  const parsed = related.map((product) => ({ ...product, tags: safeParseJson(product.tags, []) }));
  const priced = await resolveProductPrices(parsed);
  res.json({
    success: true,
    data: priced,
  });
};

/* -------------------- ADMIN CRUD -------------------- */

export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      slug,
      shortDesc,
      description,
      categoryId,
      gender,
      basePrice,
      salePrice,
      stock,
      sku,
      brand,
      tags,
      images,
      material,
      capSize,
      length,
      density,
      texture,
      color,
      rating,
      isFeatured,
      isBestSeller,
      isNewArrival,
      features,
      faqs,
      careGuides,
      includedItems,
    } = req.body;

    const normalizedName = String(name || '').trim() || 'New Product';
    const normalizedSlug = String(slug || '').trim() || `${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const normalizedDescription = String(description || '').trim();
    if (!req.user || !['ADMIN', 'SELLER'].includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    const numericBasePrice = Number(basePrice);
    const numericSalePrice = salePrice == null || salePrice === '' ? null : Number(salePrice);
    if (!Number.isFinite(numericBasePrice) || numericBasePrice <= 0) {
      throw new AppError('Original price must be greater than zero', 400);
    }
    if (numericSalePrice != null && (!Number.isFinite(numericSalePrice) || numericSalePrice < 0 || numericSalePrice >= numericBasePrice)) {
      throw new AppError('Sale price must be non-negative and below the original price', 400);
    }
    if (req.user.role === 'SELLER' && numericSalePrice != null) {
      throw new AppError('Create a seller offer to discount your product', 400);
    }

    const parseArrayField = (value: unknown): any[] => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      return [];
    };

    const parseBoolean = (value: unknown): boolean => {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }

      return false;
    };

    const normalizedTags = parseArrayField(tags);
    const normalizedFeatures = parseArrayField(features);
    const normalizedFaqs = parseArrayField(faqs);
    const normalizedCareGuides = parseArrayField(careGuides);
    const normalizedIncludedItems = parseArrayField(includedItems);
    const normalizedImages = Array.isArray(images)
      ? images.map((image: any, index: number) => {
          if (typeof image === 'string') {
            return {
              url: image,
              isPrimary: index === 0,
            };
          }

          return {
            url: image?.url || '',
            isPrimary: index === 0,
          };
        })
      : [];

    const selectedCategoryId = String(categoryId || '').trim();
    const selectedCategory = selectedCategoryId
      ? await prisma.category.findUnique({ where: { id: selectedCategoryId } })
      : null;

    if (!selectedCategory || !isAllendesiCategory(selectedCategory)) {
      res.status(400).json({ success: false, message: INVALID_CATEGORY_MESSAGE });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: normalizedName,
        slug: normalizedSlug,
        description: normalizedDescription,
        shortDesc: shortDesc || normalizedDescription,
        material,
        capSize,
        length,
        density,
        texture,
        color,
        rating: Number(rating || 0),
        isFeatured: req.user.role === 'ADMIN' ? parseBoolean(isFeatured) : false,
        isBestSeller: req.user.role === 'ADMIN' ? parseBoolean(isBestSeller) : false,
        isNewArrival: req.user.role === 'ADMIN' ? parseBoolean(isNewArrival) : false,
        tags: JSON.stringify(normalizedTags),
        category: {
          connect: {
            id: selectedCategory.id,
          },
        },
        gender: gender || 'UNISEX',
        basePrice: numericBasePrice,
        salePrice: req.user.role === 'ADMIN' ? numericSalePrice : null,
        seller: req.user.role === 'SELLER' ? { connect: { id: req.user.userId } } : undefined,
        stock: Number(stock || 0),
        sku: sku || `SKU-${Date.now()}`,
        brand: brand || 'Allendesi',
        images: {
          create: normalizedImages.filter((image) => image.url),
        },
        features: {
          create: normalizedFeatures,
        },
        faqs: {
          create: normalizedFaqs,
        },
        careGuides: {
          create: normalizedCareGuides,
        },
        includedItems: {
          create: normalizedIncludedItems,
        },
      },
      include: {
        images: true,
        features: true,
        faqs: true,
        careGuides: true,
        includedItems: true,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('CREATE PRODUCT ERROR:');
    console.error(error);

    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create product',
    });
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user || !['ADMIN', 'SELLER'].includes(req.user.role)) throw new AppError('Insufficient permissions', 403);
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { id: true, sellerId: true } });
    if (!existingProduct) throw new AppError('Product not found', 404);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && existingProduct.sellerId !== req.user.userId) throw new AppError('You do not own this product', 403);

    const {
      name,
      slug,
      shortDesc,
      description,
      categoryId,
      gender,
      basePrice,
      salePrice,
      stock,
      sku,
      brand,
      tags,
      images,
      material,
      capSize,
      length,
      density,
      texture,
      color,
      rating,
      isFeatured,
      isBestSeller,
      isNewArrival,
      features,
      faqs,
      careGuides,
      includedItems,
    } = req.body;

    const numericBasePrice = Number(basePrice);
    const numericSalePrice = salePrice == null || salePrice === '' ? null : Number(salePrice);
    if (!Number.isFinite(numericBasePrice) || numericBasePrice <= 0) throw new AppError('Original price must be greater than zero', 400);
    if (numericSalePrice != null && (!Number.isFinite(numericSalePrice) || numericSalePrice < 0 || numericSalePrice >= numericBasePrice)) {
      throw new AppError('Sale price must be non-negative and below the original price', 400);
    }
    if (!isAdmin && numericSalePrice != null) throw new AppError('Manage seller discounts through the offers workflow', 400);
    if (!isAdmin) {
      const conflictingOffer = await prisma.sellerOffer.findFirst({
        where: { productId: id, status: 'APPROVED', salePrice: { gte: numericBasePrice } },
      });
      if (conflictingOffer) throw new AppError('Original price cannot be reduced below an approved offer price', 409);
    }

    const selectedCategoryId = String(categoryId || '').trim();
    const selectedCategory = selectedCategoryId
      ? await prisma.category.findUnique({ where: { id: selectedCategoryId } })
      : null;

    if (!selectedCategory || !isAllendesiCategory(selectedCategory)) {
      res.status(400).json({ success: false, message: INVALID_CATEGORY_MESSAGE });
      return;
    }

    await prisma.productImage.deleteMany({
      where: {
        productId: id,
      },
    });
    await prisma.productFeature.deleteMany({
      where: {
        productId: id,
      },
    });

    await prisma.productFAQ.deleteMany({
      where: {
        productId: id,
      },
    });

    await prisma.careGuide.deleteMany({
      where: {
        productId: id,
      },
    });

    await prisma.includedItem.deleteMany({
      where: {
        productId: id,
      },
    });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        shortDesc,
        description,
        category: {
          connect: {
            id: selectedCategory.id,
          },
        },
        gender: gender || 'UNISEX',
        material,
        capSize,
        length,
        density,
        texture,
        color,
        rating: isAdmin ? Number(rating || 0) : undefined,
        isFeatured: isAdmin ? Boolean(isFeatured) : undefined,
        isBestSeller: isAdmin ? Boolean(isBestSeller) : undefined,
        isNewArrival: isAdmin ? Boolean(isNewArrival) : undefined,
        basePrice: numericBasePrice,
        salePrice: isAdmin ? numericSalePrice : null,
        stock: Number(stock || 0),
        sku,
        brand,
        tags: JSON.stringify(
          Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
            ? tags.split(',').map((t) => t.trim())
            : []
        ),
        images: {
          create: Array.isArray(images)
            ? images.map((url: string, index: number) => ({
                url,
                isPrimary: index === 0,
              }))
            : [],
        },
        features: {
          create: Array.isArray(features) ? features : [],
        },
        faqs: {
          create: Array.isArray(faqs) ? faqs : [],
        },
        careGuides: {
          create: Array.isArray(careGuides) ? careGuides : [],
        },
        includedItems: {
          create: Array.isArray(includedItems) ? includedItems : [],
        },
      },
      include: {
        images: true,
        features: true,
        faqs: true,
        careGuides: true,
        includedItems: true,
      },
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('UPDATE PRODUCT ERROR:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update product',
    });
  }
};


export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user || !['ADMIN', 'SELLER'].includes(req.user.role)) throw new AppError('Insufficient permissions', 403);
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { id: true, sellerId: true } });
    if (!existingProduct) throw new AppError('Product not found', 404);
    if (req.user.role !== 'ADMIN' && existingProduct.sellerId !== req.user.userId) throw new AppError('You do not own this product', 403);

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

function safeParseJson(
  val: string,
  fallback: unknown
) {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}