"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import PageHeading from "../components/PageHeading";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import BatchOutcomeSharing from "@/app/components/BatchOutcomeSharing";
import { Qty } from "@/app/components/Units";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";

const BatchSGChart = dynamic(
  () => import("../components/BatchSGChart"),
  { ssr: false, loading: () => <p className="text-sm text-white/60">Loading chart…</p> }
);

function hasTypeSpecificRecipe(batch: any) {
  return Boolean(
    batch.honey_type ||
      batch.fruits?.length ||
      batch.malts?.length ||
      batch.hops?.length ||
      batch.boil_time ||
      batch.juice_type ||
      batch.sugar_amount ||
      batch.ingredients?.length ||
      batch.steps?.length
  );
}

function getCurrentAbv(og: unknown, readings: Array<{ sg: unknown }>) {
  if (og === null || og === undefined || og === "" || readings.length === 0) {
    return null;
  }

  const originalGravity = Number(og);
  const currentGravity = Number(readings[readings.length - 1].sg);
  if (!Number.isFinite(originalGravity) || !Number.isFinite(currentGravity)) {
    return null;
  }

  return ((originalGravity - currentGravity) * 131.25).toFixed(2);
}

function getHistoryStatus(batch: any) {
  const status = String(batch.status ?? "").toLowerCase();
  if (batch.finished_date || ["finished", "avsluttet", "ferdig"].includes(status)) {
    return "finished";
  }
  if (status === "split") return "split";
  if (["aktiv", "active", "sekundær", "secondary", "conditioning"].includes(status)) {
    return "active";
  }
  return "other";
}

function getFinishedAbv(batch: any) {
  const abv =
    batch.abv === null || batch.abv === undefined || batch.abv === ""
      ? null
      : Number(batch.abv);
  if (abv !== null && Number.isFinite(abv)) {
    return abv;
  }
  if (
    batch.og === null ||
    batch.og === undefined ||
    batch.fg === null ||
    batch.fg === undefined
  ) {
    return null;
  }
  const og = Number(batch.og);
  const fg = Number(batch.fg);
  return Number.isFinite(og) && Number.isFinite(fg) && og >= fg
    ? (og - fg) * 131.25
    : null;
}

function BatchHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBatchId = searchParams.get("batchId");

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [kars, setKars] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [batchTypeFilter, setBatchTypeFilter] = useState("All");
  const [batchSearch, setBatchSearch] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("All");
  const [batchRecipeFilter, setBatchRecipeFilter] = useState("All");
  const [batchSort, setBatchSort] = useState<
    "newest" | "oldest" | "name" | "finished" | "abv"
  >("newest");
  const [sgReadingsError, setSgReadingsError] = useState("");
  const [canViewSGGraph, setCanViewSGGraph] = useState(false);
  const [batchLoadError, setBatchLoadError] = useState("");

  // ⭐ NEW: delete confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const userId = session.user.id;

      const { data: batchesRaw, error: batchesError } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (batchesError) {
        console.error("Could not load batch history", batchesError);
        setBatchLoadError("Batch history could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: karsRaw } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId);

      const sortedKars = [...(karsRaw ?? [])].sort(
        (a, b) => a.nummer - b.nummer
      );

      const batchIds = (batchesRaw ?? []).map((batch) => batch.id);
      let notesRaw: any[] = [];
      if (batchIds.length > 0) {
        const { data } = await supabaseBrowser
            .from("batch_notes")
            .select("*")
            .in("batch_id", batchIds)
            .order("created_at", { ascending: false });
        notesRaw = data ?? [];
      }

      let readingsByBatch = new Map<string, any[]>();

      if (batchIds.length > 0) {
        const readingsResponse = await fetch("/api/sg", {
          credentials: "include",
          cache: "no-store",
        });
        const readingsResult: {
          readings?: any[];
          canViewGraph?: boolean;
          error?: string;
        } = await readingsResponse.json();
        if (!readingsResponse.ok) {
          console.error("Could not load SG readings for batch timelines", readingsResult.error);
          setSgReadingsError("SG readings could not be loaded.");
        } else {
          setCanViewSGGraph(readingsResult.canViewGraph === true);
          readingsByBatch = new Map();
          for (const reading of readingsResult.readings ?? []) {
            if (!reading.batch_id) continue;
            const batchReadings = readingsByBatch.get(reading.batch_id) ?? [];
            batchReadings.push(reading);
            readingsByBatch.set(reading.batch_id, batchReadings);
          }
        }
      }

      const enriched = (batchesRaw ?? []).map((batch) => {
        const index = sortedKars.findIndex((k) => k.id === batch.aktivt_kar);
        const previousKar = sortedKars.find((k) => k.id === batch.aktivt_kar);
        const previousKarNumber = previousKar
          ? sortedKars.findIndex((k) => k.id === previousKar.id) + 1
          : null;

        const batchNotes = (notesRaw ?? []).filter(
          (n) => n.batch_id === batch.id
        );

        return {
          ...batch,
          vesselNumber: index !== -1 ? index + 1 : null,
          previousVesselNumber: previousKarNumber,
          notesLog: batchNotes,
          sgReadings: readingsByBatch.get(batch.id) ?? [],
        };
      });

      setBatches(enriched);
      setKars(sortedKars);
      setLoading(false);
    }

    load();
  }, [router]);

  useEffect(() => {
    if (!requestedBatchId || batches.length === 0) return;
    const requestedBatch = batches.find(
      (batch) => String(batch.id) === requestedBatchId
    );
    if (requestedBatch) setExpanded(String(requestedBatch.id));
  }, [batches, requestedBatchId]);

  useEffect(() => {
    if (!requestedBatchId || expanded !== requestedBatchId) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`batch-record-${requestedBatchId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded, requestedBatchId]);

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  const filteredBatches = batches
    .filter(
      (batch) =>
        batchTypeFilter === "All" ||
        String(batch.type ?? "").toLowerCase() === batchTypeFilter.toLowerCase()
    )
    .filter(
      (batch) =>
        batchStatusFilter === "All" ||
        getHistoryStatus(batch) === batchStatusFilter
    )
    .filter(
      (batch) =>
        batchRecipeFilter === "All" ||
        (batchRecipeFilter === "linked"
          ? Boolean(batch.recipe_id)
          : !batch.recipe_id)
    )
    .filter((batch) => {
      const query = batchSearch.trim().toLowerCase();
      return (
        !query ||
        String(batch.name ?? "").toLowerCase().includes(query) ||
        String(batch.type ?? "").toLowerCase().includes(query) ||
        String(batch.recipe_snapshot?.name ?? "").toLowerCase().includes(query)
      );
    });

  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (batchSort === "name") {
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
        sensitivity: "base",
      });
    }
    if (batchSort === "abv") {
      const aAbv = getFinishedAbv(a);
      const bAbv = getFinishedAbv(b);
      if (aAbv === null) return bAbv === null ? 0 : 1;
      if (bAbv === null) return -1;
      return bAbv - aAbv;
    }
    const aDate =
      batchSort === "finished" ? a.finished_date ?? a.startdato : a.startdato;
    const bDate =
      batchSort === "finished" ? b.finished_date ?? b.startdato : b.startdato;
    if (batchSort === "finished") {
      const aIsFinished = getHistoryStatus(a) === "finished";
      const bIsFinished = getHistoryStatus(b) === "finished";
      if (aIsFinished !== bIsFinished) return aIsFinished ? -1 : 1;
    }
    const aTimestamp = aDate ? new Date(aDate).getTime() : null;
    const bTimestamp = bDate ? new Date(bDate).getTime() : null;
    if (aTimestamp === null || !Number.isFinite(aTimestamp)) {
      return bTimestamp === null || !Number.isFinite(bTimestamp) ? 0 : 1;
    }
    if (bTimestamp === null || !Number.isFinite(bTimestamp)) return -1;
    const direction = batchSort === "oldest" ? 1 : -1;
    return direction * (aTimestamp - bTimestamp);
  });

  async function deleteBatch(id: string) {
    const res = await fetch("/api/batches/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setBatches((prev) => prev.filter((b) => b.id !== id));
    }
  }

  if (loading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
        Loading batches…
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-16">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <PageHeading
          title="Batch history"
          subtitle="Review your batches, fermentation details, and SG readings."
        />

        {batchLoadError && (
          <p role="alert" className="mb-6 text-center text-sm text-red-300">
            {batchLoadError}
          </p>
        )}

        {sgReadingsError && (
          <p role="alert" className="mb-6 text-center text-sm text-amber-300">
            {sgReadingsError}
          </p>
        )}

        {!batchLoadError && batches.length > 0 && (
          <section aria-label="Filter batches" className="mx-auto mb-6 max-w-full space-y-3 sm:w-fit">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Search batches</span>
                <input
                  type="search"
                  value={batchSearch}
                  onChange={(event) => setBatchSearch(event.target.value)}
                  placeholder="Search batches"
                  className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm"
                />
              </label>
              <label>
                <span className="sr-only">Sort batches</span>
                <select
                  value={batchSort}
                  onChange={(event) =>
                    setBatchSort(event.target.value as typeof batchSort)
                  }
                  className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm sm:w-auto"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="finished">Recently finished</option>
                  <option value="abv">Highest final ABV</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by batch stage</span>
                <select
                  value={batchStatusFilter}
                  onChange={(event) => setBatchStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm sm:w-auto"
                >
                  <option value="All">All stages</option>
                  <option value="active">Active</option>
                  <option value="finished">Finished</option>
                  <option value="split">Split</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by recipe</span>
                <select
                  value={batchRecipeFilter}
                  onChange={(event) => setBatchRecipeFilter(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm sm:w-auto"
                >
                  <option value="All">All recipes</option>
                  <option value="linked">Linked to a recipe</option>
                  <option value="unlinked">No linked recipe</option>
                </select>
              </label>
            </div>
            <p aria-live="polite" className="text-center text-xs text-white/50">
              Showing {sortedBatches.length} of {batches.length} batches
            </p>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              {[
                "All",
                ...Array.from(new Set(batches.map((batch) => String(batch.type ?? "").trim()).filter(Boolean)))
                  .sort((a, b) => a.localeCompare(b)),
              ].map(
                (batchType) => (
                  <button
                    key={batchType}
                    type="button"
                    onClick={() => setBatchTypeFilter(batchType)}
                    aria-pressed={batchTypeFilter === batchType}
                    className={`rounded-lg border px-2 py-2 text-center text-sm sm:px-3 ${
                      batchTypeFilter === batchType
                        ? "border-green-500 bg-green-700"
                        : "border-white/20 bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {batchType}
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {!batchLoadError && batches.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <h2 className="font-semibold">Your brewing history starts with a batch.</h2>
            <p className="mt-2 text-sm text-white/60">
              Create a batch to track fermentation, readings, bottling, and results in one place.
            </p>
            <Link
              href={kars[0] ? `/kar/${encodeURIComponent(kars[0].id)}` : "/kar/new"}
              className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-green-400/50 bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              {kars[0] ? "Start a batch in a vessel" : "Create a vessel to start a batch"}
            </Link>
          </section>
        ) : !batchLoadError && sortedBatches.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-white/70">No batches match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setBatchSearch("");
                setBatchTypeFilter("All");
                setBatchStatusFilter("All");
                setBatchRecipeFilter("All");
              }}
              className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Clear filters
            </button>
          </section>
        ) : !batchLoadError ? (
          <div className="space-y-4">
            {sortedBatches.map((batch) => {
              const isSplit =
                String(batch.status ?? "").toLowerCase() === "split";
              const isFinished =
                getHistoryStatus(batch) === "finished";
              const currentAbv = isFinished || isSplit
                ? null
                : getCurrentAbv(batch.og, batch.sgReadings);
              const status = String(batch.status ?? "");
              const normalizedStatus = status.toLowerCase();
              const isSecondary = ["sekundær", "secondary"].includes(normalizedStatus);
              const statusLabel = isFinished
                ? "Finished"
                : isSplit
                  ? "Split"
                  : isSecondary
                  ? "Secondary"
                  : ["aktiv", "active"].includes(normalizedStatus)
                    ? "Primary"
                    : status;
              const originalGravity = Number(batch.og);
              const finalGravity =
                batch.fg === null || batch.fg === undefined
                  ? null
                  : Number(batch.fg);
              const currentGravity =
                !isFinished && !isSplit && batch.sgReadings.length > 0
                  ? Number(batch.sgReadings[batch.sgReadings.length - 1].sg)
                  : null;
              const abvValue = isFinished
                ? batch.abv === null || batch.abv === undefined
                  ? null
                  : Number(batch.abv)
                : currentAbv === null
                  ? null
                  : Number(currentAbv);
              const packagedYield =
                isFinished &&
                Number(batch.volume_l) > 0 &&
                Number(batch.packaged_volume_l) >= 0
                  ? (Number(batch.packaged_volume_l) / Number(batch.volume_l)) * 100
                  : null;
              const batchMetrics = [
                {
                  label: "OG",
                  value: Number.isFinite(originalGravity)
                    ? originalGravity.toFixed(3)
                    : "—",
                },
                ...(isSplit
                  ? [{
                      label: "Split on",
                      value: batch.split_at
                        ? new Date(batch.split_at).toLocaleDateString("en-GB")
                        : "—",
                    }]
                  : [{
                      label: isFinished ? "FG" : "Current SG",
                      value: Number.isFinite(isFinished ? finalGravity : currentGravity)
                        ? Number(isFinished ? finalGravity : currentGravity).toFixed(3)
                        : "—",
                    },
                    ...(isFinished || canViewSGGraph
                      ? [{
                          label: isFinished ? "Final ABV" : "Current ABV",
                          value: abvValue !== null && Number.isFinite(abvValue)
                            ? `${abvValue.toFixed(1)}%`
                            : "—",
                        }]
                      : [])]),
              ];
              const splitChildren = isSplit
                ? batches.filter(
                    (child) => child.split_parent_batch_id === batch.id
                  )
                : [];
              const recipeSnapshot =
                batch.recipe_snapshot &&
                typeof batch.recipe_snapshot === "object" &&
                !Array.isArray(batch.recipe_snapshot)
                  ? (batch.recipe_snapshot as Record<string, unknown>)
                  : null;

              return (
                <div
                  key={batch.id}
                  id={`batch-record-${batch.id}`}
                className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.09] via-white/[0.05] to-black/40 p-4 shadow-lg shadow-black/15 sm:p-5"
                >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-green-200 sm:text-xl">
                        {batch.name || "Unnamed batch"}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          isFinished
                            ? "border-green-300/20 bg-green-300/10 text-green-100"
                            : isSplit
                              ? "border-sky-300/20 bg-sky-300/10 text-sky-100"
                            : isSecondary
                              ? "border-amber-200/20 bg-amber-200/10 text-amber-100"
                              : "border-white/15 bg-white/5 text-white/75"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/55 sm:text-sm">
                      {batch.type || "Batch"}
                      {batch.batchnummer ? ` · Batch ${batch.batchnummer}` : ""}
                      {batch.startdato
                        ? ` · Started ${new Date(batch.startdato).toLocaleDateString("en-GB")}`
                        : ""}
                      {isFinished && batch.finished_date
                        ? ` · Finished ${new Date(batch.finished_date).toLocaleDateString("en-GB")}`
                        : ""}
                    </p>
                    {batch.recipe_id ? (
                        <p className="mt-2 text-sm">
                          <span className="text-white/55">Recipe: </span>
                          <Link
                            href={`/my-recipes/${encodeURIComponent(batch.recipe_id)}`}
                            className="font-semibold text-green-200 underline underline-offset-2"
                          >
                            {String(recipeSnapshot?.name ?? "View source recipe")}
                          </Link>
                        </p>
                    ) : recipeSnapshot?.name ? (
                        <p className="mt-2 text-sm text-white/65">
                          Recipe at brew time: {String(recipeSnapshot.name)}
                        </p>
                    ) : null}
                    {isFinished && batch.packaged_volume_l != null && (
                        <p className="mt-2 text-sm text-green-100/80">
                          <strong>Outcome:</strong>{" "}
                          <Qty kind="volume" value={batch.packaged_volume_l} /> packaged
                          {packagedYield !== null
                            ? ` · ${packagedYield.toFixed(1)}% of planned volume`
                            : ""}
                          {abvValue !== null && Number.isFinite(abvValue)
                            ? ` · ${abvValue.toFixed(1)}% ABV`
                            : ""}
                        </p>
                    )}
                    {batch.split_parent_batch_id && (
                      <p className="mt-2 text-sm text-white/65">
                        Split from{" "}
                        <Link
                          href={`/batch-history?batchId=${encodeURIComponent(batch.split_parent_batch_id)}`}
                          className="font-semibold text-green-200 underline underline-offset-2"
                        >
                          batch{" "}
                          {batches.find(
                            (parent) => parent.id === batch.split_parent_batch_id
                          )?.batchnummer ?? "source"}
                        </Link>
                      </p>
                    )}
                    {isSplit && splitChildren.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm text-white/65">
                        <p>
                          Split into{" "}
                          {splitChildren.map((child, index) => (
                            <span key={child.id}>
                              {index > 0 ? ", " : ""}
                              <Link
                                href={`/batch-history?batchId=${encodeURIComponent(child.id)}`}
                                className="font-semibold text-green-200 underline underline-offset-2"
                              >
                                batch {child.batchnummer ?? "—"}
                              </Link>
                            </span>
                          ))}
                        </p>
                        {batch.split_loss_volume_l != null && (
                          <p>
                            Transfer loss:{" "}
                            <Qty
                              kind="volume"
                              value={batch.split_loss_volume_l}
                            />
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(batch.id)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-medium text-white/55 transition hover:border-white/20 hover:bg-white/10 hover:text-white/80 sm:px-3 sm:text-sm"
                    >
                      Delete
                    </button>
                    <ExpandArrowButton
                      expanded={expanded === batch.id}
                      label={batch.name || "batch"}
                      controls={`batch-details-${batch.id}`}
                      onClick={() => toggle(batch.id)}
                    />
                  </div>
                </div>

                {expanded !== batch.id && (
                  <div
                    aria-label={`${batch.name || "Batch"} summary`}
                    className={`mt-4 grid gap-2 ${
                      batchMetrics.length === 3 ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    {batchMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 sm:px-3"
                      >
                        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-white/45 sm:text-xs">
                          {metric.label}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white/90 sm:text-base">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  id={`batch-details-${batch.id}`}
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === batch.id
                      ? "max-h-[6000px] mt-4 border-t border-white/10 pt-4"
                      : "max-h-0"
                  }`}
                >
                <div className="space-y-4 opacity-90">
                    {batch.recipe_id && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <Link
                          href={`/my-recipes/${encodeURIComponent(batch.recipe_id)}`}
                          className="inline-block text-sm font-semibold text-amber-200 underline underline-offset-4"
                        >
                          View source recipe
                        </Link>
                        <Link
                          href={`/my-recipes/${encodeURIComponent(batch.recipe_id)}/versions`}
                          className="inline-block text-sm font-semibold text-amber-200 underline underline-offset-4"
                        >
                          Compare recipe versions
                        </Link>
                        <Link
                          href={`/my-recipes?start=${encodeURIComponent(batch.recipe_id)}`}
                          className="inline-block text-sm font-semibold text-green-200 underline underline-offset-4"
                        >
                          Brew this recipe again
                        </Link>
                      </div>
                    )}
                    {isFinished && (
                      <Link
                        href={`/brew-insights/${encodeURIComponent(batch.id)}`}
                        className="inline-block text-sm font-semibold text-green-200 underline underline-offset-4"
                      >
                        Review this batch’s results
                      </Link>
                    )}
                    {recipeSnapshot && (
                      <section className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4">
                        <h3 className="font-semibold text-green-300">
                          Recipe targets when this batch started
                        </h3>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
                          {recipeSnapshot.og != null &&
                            Number.isFinite(Number(recipeSnapshot.og)) && (
                              <span>
                                OG {Number(recipeSnapshot.og).toFixed(3)}
                                {Number.isFinite(Number(batch.og))
                                  ? ` · actual ${Number(batch.og).toFixed(3)}`
                                  : ""}
                              </span>
                            )}
                          {recipeSnapshot.fg != null &&
                            Number.isFinite(Number(recipeSnapshot.fg)) && (
                              <span>
                                FG target {Number(recipeSnapshot.fg).toFixed(3)}
                                {batch.fg != null
                                  ? ` · actual ${Number(batch.fg).toFixed(3)}`
                                  : ""}
                              </span>
                            )}
                          {recipeSnapshot.abv != null &&
                            Number.isFinite(Number(recipeSnapshot.abv)) && (
                              <span>
                                ABV target {Number(recipeSnapshot.abv).toFixed(1)}%
                                {batch.abv != null
                                  ? ` · actual ${Number(batch.abv).toFixed(1)}%`
                                  : ""}
                              </span>
                            )}
                          {recipeSnapshot.volume != null && (
                            <span>
                              Volume target{" "}
                              <Qty kind="volume" value={String(recipeSnapshot.volume)} />
                            </span>
                          )}
                        </div>
                      </section>
                    )}
                    {batch.type === "Beer" && batch.beer_style && (
                      <p className="text-sm">
                        <strong>Beer style:</strong> {batch.beer_style}
                      </p>
                    )}

                    <p className="text-sm">
                      <strong>{isSplit ? "Volume before split:" : "Planned volume:"}</strong>{" "}
                      <Qty
                        kind="volume"
                        value={
                          isSplit
                            ? batch.split_original_volume_l ?? batch.volume_l
                            : batch.volume_l
                        }
                      />
                    </p>

                    <p className="text-sm">
                      <strong>OG:</strong> {Number(batch.og).toFixed(3)}
                    </p>

                    {batch.fg && (
                      <p className="text-sm">
                        <strong>FG:</strong> {Number(batch.fg).toFixed(3)}
                      </p>
                    )}

                    {batch.abv !== null && batch.abv !== undefined && (
                      <p className="text-sm">
                        <strong>Final ABV:</strong> {Number(batch.abv).toFixed(2)}%
                      </p>
                    )}

                    <p className="text-sm">
                      <strong>Start date:</strong>{" "}
                      {new Date(batch.startdato).toLocaleDateString("en-GB")}
                    </p>

                    <section className="mt-6" aria-label="SG development chart">
                      <h3 className="text-xl font-bold mb-3 text-green-300">
                        SG development
                      </h3>
                      {batch.sgReadings.length === 0 ? (
                       <p className="text-sm text-zinc-400">
                         No SG readings recorded.
                       </p>
                      ) : canViewSGGraph ? (
                       <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                         <BatchSGChart readings={batch.sgReadings} />
                       </div>
                      ) : (
                       <p className="text-sm text-white/70">
                         Your SG readings are saved. The development graph is part of Premium.{" "}
                         <a href="/premium" className="text-green-200 underline">Explore Premium</a>
                        </p>
                      )}
                      {canViewSGGraph && currentAbv !== null && (
                        <p className="mt-4 text-center text-lg font-semibold text-green-300">
                          Current ABV: {currentAbv}%
                        </p>
                      )}
                    </section>

                    {(batch.type === "Beer" || batch.type === "Braggot") && (
                      <>
                        {batch.ibu !== null && batch.ibu !== undefined && (
                          <p className="text-sm">
                            <strong>IBU:</strong> {Number(batch.ibu).toFixed(0)}
                          </p>
                        )}
                        {batch.ebc !== null && batch.ebc !== undefined && (
                          <p className="text-sm">
                            <strong>EBC:</strong> {Number(batch.ebc).toFixed(0)}
                          </p>
                        )}
                      </>
                    )}

                    {batch.finished_date && (
                      <p className="text-sm">
                        <strong>Finished:</strong>{" "}
                        {new Date(batch.finished_date).toLocaleDateString("en-GB")}
                      </p>
                    )}

                    {batch.finished_notes && (
                      <p className="text-sm whitespace-pre-line">
                        <strong>Finished notes:</strong>{"\n"}
                        {batch.finished_notes}
                      </p>
                    )}

                    {batch.packaged_volume_l != null && (
                      <section className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4">
                        <h3 className="font-semibold text-green-300">Bottling &amp; storage</h3>
                        <p className="text-sm">
                          <strong>Total finished volume:</strong>{" "}
                          <Qty kind="volume" value={batch.packaged_volume_l} />
                        </p>
                        {batch.packaging_method && (
                          <p className="text-sm">
                            <strong>Method:</strong>{" "}
                            {batch.packaging_method === "Mixed packaging"
                              ? "Mixed bottles / cans"
                              : batch.packaging_method}
                          </p>
                        )}
                        {batch.package_count != null && (
                          <p className="text-sm">
                            <strong>Containers:</strong> {batch.package_count}
                          </p>
                        )}
                        {batch.bottle_volume_l != null && (
                          <p className="text-sm">
                            <strong>Bottled:</strong>{" "}
                            <Qty kind="volume" value={batch.bottle_volume_l} />
                          </p>
                        )}
                        {batch.keg_volume_l != null && (
                          <p className="text-sm">
                            <strong>Kegged:</strong>{" "}
                            <Qty kind="volume" value={batch.keg_volume_l} />
                          </p>
                        )}
                        {batch.carbonation_method && (
                          <p className="text-sm">
                            <strong>Carbonation:</strong> {batch.carbonation_method}
                            {batch.target_carbonation_volumes != null
                              ? ` · ${Number(batch.target_carbonation_volumes).toFixed(1)} volumes CO₂`
                              : ""}
                          </p>
                        )}
                        {batch.priming_sugar_g != null && (
                          <p className="text-sm">
                            <strong>Priming sugar:</strong>{" "}
                            {Number(batch.priming_sugar_g).toFixed(1)} g
                          </p>
                        )}
                        {batch.tasting_notes && (
                          <p className="whitespace-pre-line text-sm">
                            <strong>Tasting notes:</strong>{" "}
                            {batch.tasting_notes}
                          </p>
                        )}
                      </section>
                    )}

                    {isFinished && (
                      <BatchOutcomeSharing
                        batchId={batch.id}
                        batchType={batch.type}
                        hasSourceRecipe={Boolean(batch.recipe_id)}
                        initiallyShared={batch.share_outcome_publicly === true}
                        initiallySharingTastingNotes={
                          batch.share_tasting_notes_publicly === true
                        }
                      />
                    )}

                    {(batch.secondary_startdate ||
                      batch.secondary_additions ||
                      batch.secondary_notes) && (
                      <>
                        
                        {batch.secondary_startdate && (
                          <p className="text-sm">
                            <strong>Secondary since:</strong>{" "}
                            {new Date(batch.secondary_startdate).toLocaleDateString("en-GB")}
                          </p>
                        )}

                        {batch.secondary_additions && (
                          <p className="text-sm whitespace-pre-line">
                            <strong>Additions:</strong>{"\n"}
                            {formatSecondaryAdditions(batch.secondary_additions)}
                          </p>
                        )}

                        <p className="text-sm whitespace-pre-line">
                          <strong>Secondary notes:</strong>{"\n"}
                          {batch.secondary_notes?.trim() || "No notes"}
                        </p>
                      </>
                    )}

                    {(batch.conditioning_startdate || batch.conditioning_notes) && (
                      <section className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4">
                        <h3 className="font-semibold text-green-300">Conditioning</h3>
                        {batch.conditioning_startdate && (
                          <p className="text-sm">
                            <strong>Started:</strong>{" "}
                            {new Date(batch.conditioning_startdate).toLocaleDateString("en-GB")}
                          </p>
                        )}
                        <p className="whitespace-pre-line text-sm">
                          <strong>Notes:</strong>{" "}
                          {batch.conditioning_notes?.trim() || "No notes"}
                        </p>
                      </section>
                    )}

                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <h3 className="text-xl font-bold mb-3 text-green-300">Recipe</h3>

                      <div className="space-y-4 text-sm whitespace-pre-wrap">
                        {batch.type === "Mead" && (
                          <>
                            <p><strong>Honey:</strong> {batch.honey_type} – <Qty kind="kg" value={batch.honey_amount} /></p>
                            {batch.fruits?.length > 0 && (
                              <div>
                                <strong>Fruits:</strong>
                                {batch.fruits.map((fruit: any, index: number) => (
                                  <p key={index}>{fruit.name}: {fruit.amount}{fruit.unit}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {batch.type === "Beer" && (
                          <>
                            {batch.malts?.length > 0 && (
                              <div>
                                <strong>Malt additions:</strong>
                                {batch.malts.map((malt: any, index: number) => (
                                  <p key={index}>{malt.name}: <Qty kind="kg" value={malt.amount} /></p>
                                ))}
                              </div>
                            )}
                            {batch.hops?.length > 0 && (
                              <div>
                                <strong>Hop schedule:</strong>
                                {batch.hops.map((hop: any, index: number) => (
                                  <p key={index}>
                                    {hop.name}: <Qty kind="g" value={hop.amount} maxDecimals={0} /> @{" "}
                                    {hop.addition_type === "whirlpool"
                                      ? `whirlpool ${hop.time} min at ${hop.temperature}°C`
                                      : `${hop.time} min boil`}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p><strong>Total boil time:</strong> {batch.boil_time} min</p>
                          </>
                        )}

                        {batch.type === "Braggot" && (
                          <>
                            {batch.malts?.length > 0 && (
                              <div>
                                <strong>Malt additions:</strong>
                                {batch.malts.map((malt: any, index: number) => (
                                  <p key={index}>{malt.name}: <Qty kind="kg" value={malt.amount} /></p>
                                ))}
                              </div>
                            )}
                            <p><strong>Boil time:</strong> {batch.boil_time} min</p>
                            <p><strong>Honey:</strong> <Qty kind="kg" value={batch.honey_amount} /></p>
                          </>
                        )}

                        {(batch.type === "Cider" || batch.type === "Wine" || batch.type === "Seltzer") && (
                          <>
                            <p><strong>Juice type:</strong> {batch.juice_type}</p>
                            <p><strong>Sugar added:</strong> <Qty kind="kg" value={batch.sugar_amount} /></p>
                          </>
                        )}

                        {batch.type === "Other" && (
                          <>
                            {batch.ingredients?.length > 0 && (
                              <div>
                                <strong>Ingredients:</strong>
                                {batch.ingredients.map((ingredient: any, index: number) => (
                                  <p key={index}>{ingredient.name}: {ingredient.amount}{ingredient.unit}</p>
                                ))}
                              </div>
                            )}
                            {batch.steps?.length > 0 && (
                              <div>
                                <strong>Process steps:</strong>
                                {batch.steps.map((step: string, index: number) => (
                                  <p key={index}>{index + 1}. {step}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {batch.additives && (
                          <p className="whitespace-pre-line"><strong>Additives:</strong><br />{batch.additives}</p>
                        )}
                        {batch.full_process && (
                          <p><strong>Full process:</strong><br />{batch.full_process}</p>
                        )}
                        {batch.notes && typeof batch.notes === "string" && (
                          <p><strong>Recipe notes:</strong><br />{batch.notes}</p>
                        )}

                        {batch.oppskrift && !hasTypeSpecificRecipe(batch) && (
                          <div className="space-y-4">
                            <p><strong>Legacy recipe:</strong></p>
                            <p>
                              {batch.oppskrift
                                .split("Ingredients:")[1]
                                ?.split("Full process:")[0]
                                ?.trim() || batch.oppskrift}
                            </p>
                            {batch.oppskrift.includes("Full process:") && (
                              <p>
                                <strong>Full process:</strong><br />
                                {batch.oppskrift
                                  .split("Full process:")[1]
                                  ?.split("Notes:")[0]
                                  ?.trim()}
                              </p>
                            )}
                            {batch.oppskrift.includes("Notes:") && (
                              <p>
                                <strong>Recipe notes:</strong><br />
                                {batch.oppskrift.split("Notes:")[1]?.trim()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-bold mb-3 text-green-300">Batch notes</h3>

                      {batch.notesLog && batch.notesLog.length > 0 ? (
                        batch.notesLog.map((n: any) => (
                          <div
                            key={n.id}
                            className="p-4 bg-white/10 border border-white/20 rounded-xl mb-4"
                          >
                            <p className="text-sm opacity-60">
                              {new Date(n.created_at).toLocaleDateString("en-GB")}
                            </p>

                            {n.note_type === "image" && n.image_url && (
                              <Image
                                src={n.image_url}
                                alt="Batch note image"
                                width={960}
                                height={720}
                                sizes="(max-width: 768px) 100vw, 768px"
                                unoptimized
                                loading="lazy"
                                className="rounded-lg mt-3"
                              />
                            )}

                            {n.note && (
                              <p className="mt-3 whitespace-pre-line">{n.note}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="opacity-60">No notes yet.</p>
                      )}
                    </div>

                  </div>
                </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmDeleteId !== null}
          title="Delete batch?"
          message="Are you sure you want to delete this batch? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={async () => {
            if (!confirmDeleteId) return false;
            await deleteBatch(confirmDeleteId);
            return true;
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />

      </div>
    </main>
  );
}

export default function BatchHistoryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white">
          Loading batch history…
        </main>
      }
    >
      <BatchHistoryContent />
    </Suspense>
  );
}
