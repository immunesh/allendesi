'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AddProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: '',
    name: '',
    basePrice: '',
    stock: '',
    description: '',
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/categories');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data || [];

        setCategories(list);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!categories.some((category) => category.id === selectedCategoryId)) {
      alert('Please select a category.');
      return;
    }

    try {
      setSaving(true);

      const name = form.name.trim();
      const slug = `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'product'}-${Date.now()}`;

      let imageUrl = '';

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);

        const uploadRes = await fetch(
          'http://localhost:5000/api/upload/image',
          {
            method: 'POST',
            body: imageFormData,
          }
        );

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(
            uploadData.message || 'Image upload failed'
          );
        }

        imageUrl = uploadData.url;
      }

      const payload = {
        name,
        slug,
        description: form.description || '',
        shortDesc: form.description || '',
        categoryId: selectedCategoryId,
        gender: 'UNISEX',
        basePrice: Number(form.basePrice),
        stock: Number(form.stock),
        sku: `SKU-${Date.now()}`,
        brand: 'Allendesi',
        rating: 0,
        isFeatured: false,
        isBestSeller: false,
        isNewArrival: true,
        tags: [],
        features: [],
        faqs: [],
        careGuides: [],
        includedItems: [],
        images: imageUrl ? [imageUrl] : [],
      };

      const res = await fetch(
        'http://localhost:5000/api/products',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || 'Failed to create product'
        );
      }

      alert('Product added successfully!');
      router.push('/seller/products');
    } catch (error) {
      console.error(error);
      alert(String(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-5">
        <h1 className="text-2xl font-semibold text-white">
          Add Product
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Add a new product to your store inventory.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5"
      >
        {/* Company Name */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Company / Store Name
          </label>

          <input
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter your company or store name"
            required
          />
        </div>

        {/* Product Name */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Product Name
          </label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter product name"
            required
          />
        </div>

        <div>
          <label htmlFor="product-category" className="mb-2 block text-sm text-gray-300">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            id="product-category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            onInvalid={(e) => {
              e.preventDefault();
              alert('Please select a category.');
            }}
            className="input-field"
            required
            aria-required="true"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        {/* Price + Stock */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Price
            </label>

            <input
              name="basePrice"
              type="number"
              value={form.basePrice}
              onChange={handleChange}
              className="input-field"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Stock
            </label>

            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleChange}
              className="input-field"
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Product Image
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="input-field"
          />

          {imagePreview && (
            <div className="mt-4 relative h-48 w-48 overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field min-h-[120px]"
            placeholder="Write product description..."
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() =>
              alert(
                JSON.stringify(
                  {
                    ...form,
                    image: imageFile?.name || 'No image selected',
                  },
                  null,
                  2
                )
              )
            }
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-red-900/40 hover:text-white"
          >
            Preview
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Submit Product'}
          </button>
        </div>
      </form>
    </div>
  );
}