"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type Review = {
  id: string;
  username: string;
  isOwn: boolean;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  helpfulCount: number;
  viewerVotedHelpful: boolean;
  canVoteHelpful: boolean;
};

type RatingBreakdown = { rating: number; count: number };
type ReviewSort = "newest" | "highest" | "lowest";

export default function BreweryProductReviews({
  productId,
  qrSource,
}: {
  productId: string;
  qrSource: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown[]>([]);
  const [helpfulVotingUnavailable, setHelpfulVotingUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [sort, setSort] = useState<ReviewSort>("newest");
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
    setRatingBreakdown(data.ratingBreakdown);
    setHelpfulVotingUnavailable(data.helpfulVotingUnavailable === true);
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

  async function deleteOwnReview() {
    if (!pendingDelete) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/products/${productId}/reviews`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove your review.");
      await loadReviews();
      setNotice("Your review and rating have been removed.");
      return true;
    } catch (deleteError) {
      console.error("Could not remove product review", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove your review.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleHelpful(review: Review) {
    if (!review.canVoteHelpful) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/reviews/${review.id}/helpful`, {
        method: review.viewerVotedHelpful ? "DELETE" : "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update helpful vote.");
      await loadReviews();
    } catch (voteError) {
      console.error("Could not update helpful vote", voteError);
      setError(voteError instanceof Error ? voteError.message : "Could not update helpful vote.");
    } finally {
      setBusy(false);
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === "highest") return b.rating - a.rating || b.created_at.localeCompare(a.created_at);
    if (sort === "lowest") return a.rating - b.rating || b.created_at.localeCompare(a.created_at);
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <section aria-labelledby="product-reviews-heading" className="mt-10 border-t border-white/10 pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="product-reviews-heading" className="text-xl font-semibold text-green-200">Community reviews</h2>
        <p className="text-sm text-white/60">{average == null ? "No ratings yet" : `${average.toFixed(1)} / 5 · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}</p>
      </div>
      <p className="mt-2 text-xs text-white/45">Ratings are community opinions and are not affected by brewery subscriptions.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-green-200">{notice}</p>}
      {!loading && reviews.length > 0 && (
        <section aria-label="Rating breakdown" className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Rating breakdown</h3>
            <p className="text-xs text-white/50">Based on the {reviews.length} most recent reviews</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ratingBreakdown.map(({ rating: starRating, count }) => (
              <div key={starRating} className="text-center">
                <div className="text-xs text-amber-200" aria-label={`${starRating} stars`}>
                  {starRating} ★
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"
                  role="meter"
                  aria-label={`${count} ${starRating}-star reviews`}
                  aria-valuemin={0}
                  aria-valuemax={reviews.length}
                  aria-valuenow={count}
                >
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-1 text-xs tabular-nums text-white/60">{count}</div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {!loading && reviews.length > 0 && (
        <div className="mt-5 flex justify-end">
          <label className="text-sm text-white/65">
            Sort reviews
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
              className="ml-2 rounded-lg border border-white/20 bg-zinc-900 px-3 py-2 text-white"
            >
              <option value="newest">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </label>
        </div>
      )}
      {!loading && helpfulVotingUnavailable && (
        <p role="status" className="mt-3 text-xs text-white/55">
          Helpful votes will be available after the review-voting database migration is applied.
        </p>
      )}
      {loading ? <p className="mt-5 text-sm text-white/55">Loading reviews…</p> : reviews.length === 0 ? <p className="mt-5 text-sm text-white/55">Be the first to review this product.</p> : (
        <ul className="mt-5 space-y-3">
          {sortedReviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{review.title || `${review.rating} out of 5`}</h3>
                <span className="text-sm text-green-200">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">{review.body}</p>
              <div className="mt-3 flex justify-between gap-3 text-xs text-white/45">
                <span>{review.username} · {new Date(review.created_at).toLocaleDateString()}</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy || !review.canVoteHelpful}
                    onClick={() => void toggleHelpful(review)}
                    aria-pressed={review.viewerVotedHelpful}
                    title={review.canVoteHelpful ? undefined : "Sign in to vote; you cannot vote on your own review."}
                    className={`underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${review.viewerVotedHelpful ? "text-green-200" : "hover:text-white"}`}
                  >
                    {review.viewerVotedHelpful ? "Helpful ✓" : "Helpful"} · {review.helpfulCount}
                  </button>
                  {review.isOwn ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingDelete(review)}
                      className="underline underline-offset-2 hover:text-red-200 disabled:opacity-50"
                    >
                      Remove my review
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => void reportReview(review)} className="underline underline-offset-2 hover:text-white">
                      Report
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-xs text-white/40"><Link href="/business" className="underline">Browse Beer &amp; Brewing Reviews</Link></p>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove your review?"
        message="This will permanently delete your rating and written review for this product."
        confirmLabel="Remove review"
        onConfirm={deleteOwnReview}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
