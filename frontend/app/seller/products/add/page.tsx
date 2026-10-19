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
    offerMode: 'PERCENTAGE' as 'PERCENTAGE' | 'SALE_PRICE',
    offerValue: '',
    offerStartsAt: '',
    offerEndsAt: '',
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

  const calculatedOfferPrice = (() => {
    const basePrice = Number(form.basePrice);
    const value = Number(form.offerValue);
    if (!form.offerValue || !Number.isFinite(basePrice) || !Number.isFinite(value)) return null;
    return form.offerMode === 'PERCENTAGE'
      ? Math.round(basePrice * (1 - value / 100) * 100) / 100
      : value;
  })();

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!categories.some((category) => category.id === selectedCategoryId)) {
      alert('Please select a category.');
      return;
    }
    const hasOffer = Boolean(form.offerValue.trim() || form.offerStartsAt || form.offerEndsAt);
    if (hasOffer) {
      if (!form.offerValue.trim() || !form.offerStartsAt || !form.offerEndsAt) {
        alert('Enter an offer value, start date, and end date, or leave all offer fields empty.');
        return;
      }
      const value = Number(form.offerValue);
      if (!Number.isFinite(value) || value <= 0 || (form.offerMode === 'PERCENTAGE' && value > 100)) {
        alert('Enter a valid discount or sale price.');
        return;
      }
      if (calculatedOfferPrice == null || calculatedOfferPrice < 0 || calculatedOfferPrice >= Number(form.basePrice)) {
        alert('The sale price must be non-negative and below the original price.');
        return;
      }
      if (new Date(form.offerEndsAt) <= new Date(form.offerStartsAt)) {
        alert('Offer end date must be later than its start date.');
        return;
      }
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
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
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

      if (hasOffer) {
        const offerPayload = {
          productId: data.data.id,
          discountPercent: form.offerMode === 'PERCENTAGE' ? Number(form.offerValue) : null,
          salePrice: form.offerMode === 'SALE_PRICE' ? Number(form.offerValue) : calculatedOfferPrice,
          startsAt: new Date(form.offerStartsAt).toISOString(),
          endsAt: new Date(form.offerEndsAt).toISOString(),
        };
        const offerRes = await fetch('http://localhost:5000/api/offers/seller', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: JSON.stringify(offerPayload),
        });
        const offerData = await offerRes.json();
        if (!offerRes.ok) {
          alert(`Product added, but the offer was not submitted: ${offerData.message || 'Please submit it from Offers & Discounts.'}`);
          router.push('/seller/offers');
          return;
        }
      }

      alert(hasOffer ? 'Product and offer submitted successfully.' : 'Product added successfully!');
      router.push(hasOffer ? '/seller/offers' : '/seller/products');
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

        <fieldset className="space-y-4 border border-white/10 p-4">
          <legend className="px-2 text-sm font-semibold text-white">Optional offer</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-300">Set offer by
              <select value={form.offerMode} onChange={(e) => setForm({ ...form, offerMode: e.target.value as 'PERCENTAGE' | 'SALE_PRICE', offerValue: '' })} className="input-field mt-1">
                <option value="PERCENTAGE">Discount percentage</option>
                <option value="SALE_PRICE">Sale price</option>
              </select>
            </label>
            <label className="block text-sm text-gray-300">{form.offerMode === 'PERCENTAGE' ? 'Discount percentage' : 'Sale price'}
              <input type="number" min="0" step="0.01" max={form.offerMode === 'PERCENTAGE' ? 100 : undefined} value={form.offerValue} onChange={(e) => setForm({ ...form, offerValue: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm text-gray-300">Offer starts
              <input type="datetime-local" value={form.offerStartsAt} onChange={(e) => setForm({ ...form, offerStartsAt: e.target.value })} className="input-field mt-1" />
            </label>
            <label className="block text-sm text-gray-300">Offer ends
              <input type="datetime-local" value={form.offerEndsAt} onChange={(e) => setForm({ ...form, offerEndsAt: e.target.value })} className="input-field mt-1" />
            </label>
          </div>
          {calculatedOfferPrice != null && <p className="text-xs text-gray-400">Original price: {form.basePrice || '—'} · Calculated sale price: {calculatedOfferPrice.toFixed(2)}</p>}
          <p className="text-xs text-gray-500">Seller offers follow the marketplace approval policy.</p>
        </fieldset>

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