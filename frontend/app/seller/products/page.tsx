'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2 } from 'lucide-react';

type Product = {
  id: string;
  categoryId?: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number | null;
  stock: number;
  category: {
    name: string;
  };
  images: {
    url: string;
  }[];
};

type ProductDraft = {
  name: string;
  categoryId: string;
  basePrice: string;
  stock: string;
  description: string;
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>({
    name: '',
    categoryId: '',
    basePrice: '',
    stock: '',
    description: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');

      if (!res.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await res.json();

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
      console.error('Failed to load products', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchCategories();
      await fetchProducts();
    })();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      categoryId: categories.some((category) => category.id === product.categoryId)
        ? product.categoryId || ''
        : '',
      basePrice: String(product.basePrice),
      stock: String(product.stock),
      description: product.name,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ name: '', categoryId: '', basePrice: '', stock: '', description: '' });
  };

  const saveEdit = async (productId: string) => {
    if (!categories.some((category) => category.id === draft.categoryId)) {
      alert('Please select a category.');
      return;
    }

    try {
      setSavingId(productId);

      const res = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: draft.description || draft.name,
          shortDesc: draft.description || draft.name,
          categoryId: draft.categoryId,
          gender: 'UNISEX',
          basePrice: Number(draft.basePrice),
          stock: Number(draft.stock),
          sku: `SKU-${Date.now()}`,
          brand: 'Allendesi',
          tags: [],
          images: [],
          features: [],
          faqs: [],
          careGuides: [],
          includedItems: [],
          rating: 0,
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update product');
      }

      await fetchProducts();
      cancelEdit();
      alert('Product updated successfully');
    } catch (error) {
      console.error('Failed to update product', error);
      alert(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setSavingId(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    const confirmed = window.confirm('Delete this product?');

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(productId);

      const res = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete product');
      }

      await fetchProducts();
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Failed to delete product', error);
      alert(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-6 text-white">
        Loading products...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Products</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your store inventory and pricing.
          </p>
        </div>

        <Link
          href="/seller/products/add"
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-10 text-center text-gray-400">
          No products found. Add your first product.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
{Array.isArray(products) &&
  products.map((product) => {
    const image =
      product.images?.[0]?.url || '/images/product-placeholder.png';

    return (
      <div
        key={product.id}
        className="overflow-hidden rounded-3xl border border-red-950/40 bg-[#0b0b0b] transition hover:-translate-y-1 hover:border-red-800/70"
      >
        <div className="relative h-56 w-full">
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-400">
              {product.category?.name || 'Uncategorized'}
            </p>

            {editingId === product.id ? (
              <div className="mt-2 space-y-2">
                <label className="block text-sm text-gray-300">
                  Category <span className="text-red-400">*</span>
                  <select
                    value={draft.categoryId}
                    onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                {!draft.categoryId && (
                  <p className="text-xs text-amber-400">
                    {product.category?.name
                      ? `Current category “${product.category.name}” is no longer allowed. Select a valid category to save.`
                      : 'Please select a valid category to save.'}
                  </p>
                )}
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full rounded-lg border border-red-950/40 bg-[#090909] px-3 py-2 text-sm text-white"
                  placeholder="Product name"
                />
                <input
                  value={draft.basePrice}
                  onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
                  type="number"
                  className="w-full rounded-lg border border-red-950/40 bg-[#090909] px-3 py-2 text-sm text-white"
                  placeholder="Price"
                />
                <input
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                  type="number"
                  className="w-full rounded-lg border border-red-950/40 bg-[#090909] px-3 py-2 text-sm text-white"
                  placeholder="Stock"
                />
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="min-h-20 w-full rounded-lg border border-red-950/40 bg-[#090909] px-3 py-2 text-sm text-white"
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(product.id)}
                    disabled={savingId === product.id}
                    className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {savingId === product.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full border border-red-950/40 px-3 py-1.5 text-sm text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <h3 className="mt-2 text-lg font-semibold text-white">
                {product.name}
              </h3>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              {product.salePrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    ₹{product.salePrice}
                  </span>

                  <span className="text-sm text-gray-500 line-through">
                    ₹{product.basePrice}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-semibold text-white">
                  ₹{product.basePrice}
                </span>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                product.stock > 0
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {product.stock > 0
                ? `${product.stock} in stock`
                : 'Out of stock'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startEdit(product)}
              className="inline-flex items-center gap-1 rounded-full border border-red-950/40 px-3 py-1.5 text-sm text-gray-300"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => deleteProduct(product.id)}
              disabled={deletingId === product.id}
              className="inline-flex items-center gap-1 rounded-full border border-red-950/40 px-3 py-1.5 text-sm text-gray-300 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deletingId === product.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  })}
        </div>
      )}
    </div>
  );
}