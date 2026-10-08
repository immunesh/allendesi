"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { api, uploadApi } from "@/lib/api";
import { getHeroSlides } from "@/lib/hero-api";

type HeroSlide = {
  id: string;
  headline: string;
  description?: string | null;
  image: string;
  cta?: string | null;
  ctaLink?: string | null;
  order?: number;
  isActive?: boolean;
};

const inputClassName =
  "w-full rounded-lg border border-white/15 bg-[#101522] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none";

export default function HeroSectionPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [slide, setSlide] = useState<HeroSlide | null>(null);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHero() {
      try {
        const result = await getHeroSlides();
        const loadedSlides = Array.isArray(result) ? result : [];
        const current = loadedSlides.find((item) => item.isActive) || loadedSlides[0];
        if (!cancelled) {
          setSlides(loadedSlides);
          if (current) selectSlide(current);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load the current hero section.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHero();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectSlide(selected: HeroSlide) {
    setSlide(selected);
    setHeadline(selected.headline || "");
    setDescription(selected.description || "");
    setCta(selected.cta || "");
    setCtaLink(selected.ctaLink || "");
    setImage(null);
    setImagePreview(selected.image || "");
    setError("");
    setMessage("");
  }

  function startNewSlide() {
    setSlide(null);
    setHeadline("");
    setDescription("");
    setCta("");
    setCtaLink("");
    setImage(null);
    setImagePreview("");
    setError("");
    setMessage("");
  }

  async function handleDelete(target: HeroSlide) {
    if (!window.confirm(`Delete "${target.headline}"? This cannot be undone.`)) return;

    setError("");
    setMessage("");
    try {
      await api.delete(`/hero-slides/${target.id}`);
      const remainingSlides = slides.filter((item) => item.id !== target.id);
      setSlides(remainingSlides);

      if (slide?.id === target.id) {
        const nextSlide = remainingSlides.find((item) => item.isActive) || remainingSlides[0];
        if (nextSlide) selectSlide(nextSlide);
        else startNewSlide();
      }

      setMessage("Hero slide deleted.");
    } catch (deleteError) {
      const apiError = deleteError as {
        response?: { data?: { message?: string } };
      };
      setError(apiError.response?.data?.message || "Could not delete this hero slide.");
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      let imageUrl = slide?.image || "";
      if (image) {
        const formData = new FormData();
        formData.append("image", image);
        const uploadResponse = await uploadApi.image(formData);
        imageUrl = uploadResponse.data.url;
      }

      if (!imageUrl) {
        throw new Error("Upload a hero image before publishing.");
      }

      const payload = {
        headline: headline.trim(),
        description: description.trim(),
        cta: cta.trim(),
        ctaLink: ctaLink.trim(),
        image: imageUrl,
        isActive: true,
        order: slide?.order ?? 0,
      };

      const response = slide
        ? await api.put(`/hero-slides/${slide.id}`, payload)
        : await api.post("/hero-slides", payload);

      setSlide(response.data);
      setSlides((currentSlides) =>
        slide
          ? currentSlides.map((item) => item.id === slide.id ? response.data : item)
          : [...currentSlides, response.data]
      );
      setImage(null);
      setImagePreview(response.data.image);
      setMessage("Hero section published successfully.");
    } catch (saveError) {
      const apiError = saveError as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        apiError.response?.data?.message ||
          apiError.message ||
          "Could not save the hero section. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-300">Loading hero section...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Storefront
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Hero Section
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Create and manage the banners shown on the Allendesi homepage.
        </p>
        <button
          type="button"
          onClick={startNewSlide}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-300/30 px-4 text-sm font-medium text-cyan-200 transition hover:bg-cyan-300/10"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add another slide
        </button>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <section className="space-y-5 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-white">
            {slide ? `Editing: ${slide.headline}` : "New hero slide"}
          </h2>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="hero-image">
              Hero image
            </label>
            <label
              htmlFor="hero-image"
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-black/10 px-4 text-sm text-slate-300 transition hover:border-cyan-300/60 hover:bg-cyan-300/5"
            >
              <ImagePlus className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <span>{image ? image.name : "Choose a new image"}</span>
              <span className="text-xs text-slate-500">JPG, PNG, WebP</span>
            </label>
            <input
              id="hero-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImage(file);
                setImagePreview(URL.createObjectURL(file));
                setMessage("");
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="hero-title">
              Hero title
            </label>
            <input
              id="hero-title"
              required
              maxLength={120}
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Welcome to Allendesi"
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="hero-description">
              Description
            </label>
            <textarea
              id="hero-description"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Discover products from trusted sellers on Allendesi."
              className={inputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="hero-cta">
                Button text
              </label>
              <input
                id="hero-cta"
                value={cta}
                onChange={(event) => setCta(event.target.value)}
                placeholder="Shop Now"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="hero-link">
                Button link
              </label>
              <input
                id="hero-link"
                value={ctaLink}
                onChange={(event) => setCtaLink(event.target.value)}
                placeholder="/products"
                className={inputClassName}
              />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Publishing..." : "Save Changes"}
          </button>
        </section>

        <section aria-label="Hero preview">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">Preview</h2>
            <span className="text-xs text-slate-500">Homepage banner</span>
          </div>
          <div className="relative flex min-h-72 items-end overflow-hidden rounded-lg border border-white/10 bg-[#141a23] p-5 sm:min-h-96 sm:p-7">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Hero section preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="relative z-10 max-w-md text-white">
              <h3 className="text-2xl font-bold leading-tight sm:text-3xl">
                {headline || "Your hero title"}
              </h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/80">
                {description || "Your description will appear here."}
              </p>
              {cta && (
                <span className="mt-4 inline-flex rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
                  {cta}
                </span>
              )}
            </div>
            {!imagePreview && (
              <span className="absolute right-4 top-4 rounded bg-black/50 px-2 py-1 text-xs text-white/70">
                Image preview
              </span>
            )}
          </div>
        </section>
      </form>

      <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Hero slides</h2>
            <p className="mt-1 text-sm text-slate-400">{slides.length} slide{slides.length === 1 ? "" : "s"}</p>
          </div>
          <button
            type="button"
            onClick={startNewSlide}
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-cyan-400 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add slide
          </button>
        </div>

        {slides.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 px-4 py-8 text-center text-sm text-slate-400">
            No hero slides yet. Add a slide to publish your first homepage banner.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {slides.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img
                  src={item.image}
                  alt=""
                  className="h-14 w-20 rounded-md border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.headline}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.isActive ? "Published" : "Draft"}
                    {item.id === slide?.id ? " · Currently editing" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectSlide(item)}
                    aria-label={`Edit ${item.headline}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 px-3 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.headline}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/25 px-3 text-sm text-red-300 transition hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}