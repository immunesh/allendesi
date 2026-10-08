import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Products count
    const totalProducts = await prisma.product.count();

    // Orders count
    const totalOrders = await prisma.order.count();

    // Delivered orders
    const deliveredOrders = await prisma.order.count({
      where: {
        status: 'DELIVERED',
      },
    });

    // Revenue
    const sales = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
    });

    // Category wise sales
    const categories = await prisma.category.findMany({
      select: { name: true },
    });

    const categorySales = categories.map((category) => ({
      category: category.name,
      amount: 0,
      percent: 0,
    }));

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
      },
    });

    res.status(200).json({
      totalProducts: Number(totalProducts ?? 0),
      totalOrders: Number(totalOrders ?? 0),
      deliveredOrders: Number(deliveredOrders ?? 0),
      totalSales: Number(sales._sum.total ?? 0),
      categorySales: Array.isArray(categorySales) ? categorySales : [],
      recentTransactions: Array.isArray(recentOrders)
        ? recentOrders.map((order) => ({
            id: order.orderNumber,
            amount: Number(order.total ?? 0),
            status: order.status,
            customer: `${order.user?.firstName ?? 'Customer'} ${order.user?.lastName ?? ''}`.trim(),
          }))
        : [],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch dashboard stats',
    });
  }
};