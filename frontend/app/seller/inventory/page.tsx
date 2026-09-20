'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, AlertTriangle } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  stock: number;
  basePrice: number;
  salePrice?: number | null;
  sku: string;
  category?: {
    name: string;
  };
  images?: {
    url: string;
  }[];
};

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products');

        if (!res.ok) {
          throw new Error('Failed to fetch inventory');
        }

        const data = await res.json();

        console.log('Inventory API response:', data);

        if (Array.isArray(data)) {
          setProducts(data);
        } else if (Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to load inventory', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const totalStock = products.reduce(
    (sum, product) => sum + (product.stock ?? 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) => (product.stock ?? 0) <= 5
  );

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-white">
        Loading inventory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-5">
        <h1 className="text-2xl font-semibold text-white">Inventory</h1>

        <p className="mt-1 text-sm text-gray-400">
          Keep stock levels healthy and avoid overselling.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-red-400" />

            <span className="text-sm text-gray-400">Products</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {products.length}
          </p>
        </div>

        <div className="rounded-2xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-red-400" />

            <span className="text-sm text-gray-400">Total Units</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {totalStock}
          </p>
        </div>

        <div className="rounded-2xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />

            <span className="text-sm text-gray-400">Low Stock</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {lowStockProducts.length}
          </p>
        </div>
      </div>

      {/* Inventory List */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Inventory Items
            </h2>

            <p className="text-sm text-gray-400">
              Real-time stock data from your database.
            </p>
          </div>

          <Link
            href="/seller/products/add"
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Add Product
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-gray-500">
            No products found.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const image =
                product.images?.[0]?.url ||
                '/images/product-placeholder.png';

              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-black/30">
                      <Image
                        src={image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <p className="font-medium text-white">
                        {product.name}
                      </p>

                      <p className="text-sm text-gray-400">
                        {product.category?.name || 'Uncategorized'}
                      </p>

                      <p className="text-xs text-gray-500">
                        SKU: {product.sku}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Price</p>

                      <p className="font-semibold text-white">
                        ₹
                        {(
                          product.salePrice ?? product.basePrice
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-400">Stock</p>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          (product.stock ?? 0) > 5
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}
                      >
                        {(product.stock ?? 0) > 0
                          ? `${product.stock} units`
                          : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}