"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Review = {
  id: string;
  user_id: string;
  username: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
};

export default function BreweryProductReviews({
  productId,
  qrSource,
}: {
  productId: string;
  qrSource: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const ratingLabels: Record<string, string> = {
    "1": "Not for me",
    "2": "Could be better",
    "3": "Good",
    "4": "Really good",
    "5": "Excellent",
  };

  const loadReviews = useCallback(async () => {
    const response = await fetch(`/api/brewery/products/${productId}/reviews`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load reviews.");
    setReviews(data.reviews);
    setAverage(data.average);
  }, [productId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (qrSource) {
          const response = await fetch("/api/brewery/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, source: "qr" }),
          });
          if (!response.ok) console.error("Could not record QR visit", await response.json());
        } else {
          const response = await fetch("/api/brewery/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, source: "page" }),
          });
          if (!response.ok) console.error("Could not record product page visit", await response.json());
        }
        await loadReviews();
      } catch (loadError) {
        console.error("Could not load product reviews", loadError);
        if (active) setError("Reviews could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [loadReviews, productId, qrSource]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/products/${productId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating), title, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit review.");
      setTitle("");
      setBody("");
      await loadReviews();
      setNotice("Your review has been published. Reviews are independent of brewery subscriptions.");
    } catch (submitError) {
      console.error("Could not submit product review", submitError);
      setError(submitError instanceof Error ? submitError.message : "Could not submit review.");
    } finally {
      setBusy(false);
    }
  }

  async function reportReview(review: Review) {
    const reason = window.prompt("Why are you reporting this review?");
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/brewery/reviews/${review.id}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not report review.");
      setNotice("Review reported for moderation.");
    } catch (reportError) {
      console.error("Could not report product review", reportError);
      setError(reportError instanceof Error ? reportError.message : "Could not report review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="product-reviews-heading" className="mt-10 border-t border-white/10 pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="product-reviews-heading" className="text-xl font-semibold text-green-200">Community reviews</h2>
        <p className="text-sm text-white/60">{average == null ? "No ratings yet" : `${average.toFixed(1)} / 5 · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}</p>
      </div>
      <p className="mt-2 text-xs text-white/45">Ratings are community opinions and are not affected by brewery subscriptions.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-green-200">{notice}</p>}

      <form onSubmit={submitReview} className="mt-5 grid gap-5 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div>
          <h3 className="font-semibold">How was it?</h3>
          <p className="mt-1 text-sm text-white/55">Leave a quick rating, or add a few details for the community.</p>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-white/80">Your rating</legend>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} out of 5`}
                aria-pressed={Number(rating) === value}
                onClick={() => setRating(String(value))}
                className="rounded-md p-1 text-3xl leading-none transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
              >
                <span className={value <= Number(rating) ? "text-amber-300" : "text-white/25"} aria-hidden="true">★</span>
              </button>
            ))}
            <span className="ml-2 text-sm text-amber-200" aria-live="polite">{ratingLabels[rating]}</span>
          </div>
        </fieldset>
        <label className="block text-sm">
          Short headline <span className="text-white/45">(optional)</span>
          <input
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What stood out?"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white placeholder:text-white/35"
          />
        </label>
        <label className="block text-sm">
          Your thoughts
          <textarea
            required
            minLength={1}
            maxLength={3000}
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share what you liked or what others should know."
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white placeholder:text-white/35"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} className="rounded-lg border border-green-400/30 bg-green-700 px-4 py-2 font-semibold disabled:opacity-50">{busy ? "Submitting…" : "Share review"}</button>
          <p className="text-xs text-white/50">Sign in to review. You can update your review by submitting another one.</p>
        </div>
      </form>

      {loading ? <p className="mt-5 text-sm text-white/55">Loading reviews…</p> : reviews.length === 0 ? <p className="mt-5 text-sm text-white/55">Be the first to review this product.</p> : (
        <ul className="mt-5 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{review.title || `${review.rating} out of 5`}</h3>
                <span className="text-sm text-green-200">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">{review.body}</p>
              <div className="mt-3 flex justify-between gap-3 text-xs text-white/45">
                <span>{review.username} · {new Date(review.created_at).toLocaleDateString()}</span>
                <button type="button" disabled={busy} onClick={() => void reportReview(review)} className="underline underline-offset-2 hover:text-white">Report</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-xs text-white/40"><Link href="/business" className="underline">Browse Beer &amp; Brewing Reviews</Link></p>
    </section>
  );
}
