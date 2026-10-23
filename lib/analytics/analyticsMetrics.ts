import type { SupabaseClient } from "@supabase/supabase-js";
import { getAcquisitionSource } from "@/lib/analytics/acquisitionSource";

const ACTIVITY_PAGE_SIZE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type ActivitySource =
  | "batches"
  | "recipes"
  | "inventory_items"
  | "batch_notes"
  | "forum_topics"
  | "forum_replies"
  | "sg_readings";

type ActivityRecord = Record<string, unknown>;

async function getSignupRows(
  serviceRole: SupabaseClient,
  since: string
): Promise<{ id: string; created_at: string; signup_source: string | null }[]> {
  const rows: { id: string; created_at: string; signup_source: string | null }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("id,created_at,signup_source")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + ACTIVITY_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load signup cohorts: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < ACTIVITY_PAGE_SIZE) break;
    from += ACTIVITY_PAGE_SIZE;
  }
  return rows;
}

async function getFirstBatchRows(
  serviceRole: SupabaseClient,
  since: string
): Promise<{ id: string; user_id: string | null; created_at: string; status: string | null }[]> {
  const rows: { id: string; user_id: string | null; created_at: string; status: string | null }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await serviceRole
      .from("batches")
      .select("id,user_id,created_at,status")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + ACTIVITY_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load first-batch cohorts: ${error.message}`);
    rows.push(...((data ?? []) as {
      id: string;
      user_id: string | null;
      created_at: string;
      status: string | null;
    }[]));
    if (!data || data.length < ACTIVITY_PAGE_SIZE) break;
    from += ACTIVITY_PAGE_SIZE;
  }
  return rows;
}

async function getUserLifecycleAnalytics(
  serviceRole: SupabaseClient,
  now: Date
) {
  const firstCohortMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)
  );
  const since = firstCohortMonth.toISOString();
  const [
    signups,
    batchRows,
    recipeRows,
    inventoryRows,
    noteRows,
    readingRows,
  ] = await Promise.all([
    getSignupRows(serviceRole, since),
    getFirstBatchRows(serviceRole, since),
    getRowsSince(serviceRole, "recipes", "id,user_id,created_at", since),
    getRowsSince(serviceRole, "inventory_items", "id,user_id,created_at", since),
    getRowsSince(serviceRole, "batch_notes", "id,user_id,created_at", since),
    getRowsSince(serviceRole, "sg_readings", "id,batch_id,created_at", since),
  ]);

  const activityRows: { user_id: string; last_seen_at: string }[] = [];
  for (let from = 0; ; from += ACTIVITY_PAGE_SIZE) {
    const { data, error } = await serviceRole
      .from("analytics_user_activity")
      .select("user_id,last_seen_at")
      .order("user_id", { ascending: true })
      .range(from, from + ACTIVITY_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Could not load user retention analytics: ${error.message}`);
    }
    activityRows.push(...(data ?? []));
    if (!data || data.length < ACTIVITY_PAGE_SIZE) break;
  }

  const signupByUser = new Map(signups.map((signup) => [signup.id, signup.created_at]));
  const batchesByUser = new Map<string, typeof batchRows>();
  const batchById = new Map(batchRows.map((batch) => [batch.id, batch]));
  for (const batch of batchRows) {
    if (!batch.user_id) continue;
    const signupAt = signupByUser.get(batch.user_id);
    if (!signupAt || new Date(batch.created_at) < new Date(signupAt)) continue;
    const rows = batchesByUser.get(batch.user_id) ?? [];
    rows.push(batch);
    batchesByUser.set(batch.user_id, rows);
  }
  for (const rows of batchesByUser.values()) {
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const firstBatchAtByUser = new Map<string, number>();
  const returnEventsByUser = new Map<string, number[]>();
  const featureAtByUser = new Map<string, Map<string, number>>();
  const addEvent = (userId: string, createdAt: unknown) => {
    const timestamp = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
    if (!Number.isFinite(timestamp) || !signupByUser.has(userId)) return;
    const events = returnEventsByUser.get(userId) ?? [];
    events.push(timestamp);
    returnEventsByUser.set(userId, events);
  };
  const addFeatureUse = (userId: unknown, feature: string, createdAt: unknown) => {
    if (typeof userId !== "string") return;
    const signupAt = signupByUser.get(userId);
    const timestamp = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
    if (!signupAt || !Number.isFinite(timestamp) || timestamp < Date.parse(signupAt)) return;
    const features = featureAtByUser.get(userId) ?? new Map<string, number>();
    const existing = features.get(feature);
    if (existing === undefined || timestamp < existing) features.set(feature, timestamp);
    featureAtByUser.set(userId, features);
  };

  for (const [userId, rows] of batchesByUser) {
    if (rows[0]) firstBatchAtByUser.set(userId, Date.parse(rows[0].created_at));
    for (const batch of rows) addEvent(userId, batch.created_at);
  }
  for (const recipe of recipeRows) {
    addFeatureUse(recipe.user_id, "Recipes", recipe.created_at);
    if (typeof recipe.user_id === "string") addEvent(recipe.user_id, recipe.created_at);
  }
  for (const inventoryItem of inventoryRows) {
    addFeatureUse(inventoryItem.user_id, "Inventory", inventoryItem.created_at);
    if (typeof inventoryItem.user_id === "string") {
      addEvent(inventoryItem.user_id, inventoryItem.created_at);
    }
  }
  for (const note of noteRows) {
    addFeatureUse(note.user_id, "Brew logs", note.created_at);
    if (typeof note.user_id === "string") addEvent(note.user_id, note.created_at);
  }
  for (const reading of readingRows) {
    const batch = batchById.get(String(reading.batch_id ?? ""));
    if (!batch?.user_id) continue;
    const readingAt = typeof reading.created_at === "string"
      ? Date.parse(reading.created_at)
      : NaN;
    const batchAt = Date.parse(batch.created_at);
    if (Number.isFinite(readingAt) && Number.isFinite(batchAt) && readingAt > batchAt + DAY_MS) {
      addFeatureUse(batch.user_id, "Brew logs", reading.created_at);
    }
    addEvent(batch.user_id, reading.created_at);
  }

  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(
      firstCohortMonth.getUTCFullYear(),
      firstCohortMonth.getUTCMonth() + index,
      1
    ));
    return {
      month: date.toISOString().slice(0, 7),
      signups: 0,
      firstBatchUsers: 0,
      secondBatchUsers: 0,
      conversionRatePercent: 0,
    };
  });
  const monthByKey = new Map(months.map((month) => [month.month, month]));
  for (const signup of signups) {
    const cohort = monthByKey.get(signup.created_at.slice(0, 7));
    if (!cohort) continue;
    cohort.signups += 1;
    const batchCount = batchesByUser.get(signup.id)?.length ?? 0;
    if (batchCount >= 1) cohort.firstBatchUsers += 1;
    if (batchCount >= 2) cohort.secondBatchUsers += 1;
  }
  for (const cohort of months) {
    cohort.conversionRatePercent = cohort.signups
      ? Math.round((cohort.firstBatchUsers / cohort.signups) * 100)
      : 0;
  }

  const median = (values: number[]) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const value = sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
    return Math.round(value * 10) / 10;
  };
  const firstBatchDurations = signups.flatMap((signup) => {
    const firstBatchAt = firstBatchAtByUser.get(signup.id);
    if (firstBatchAt === undefined) return [];
    const duration = (firstBatchAt - Date.parse(signup.created_at)) / DAY_MS;
    return duration >= 0 ? [duration] : [];
  });
  const sevenDayCutoff = now.getTime() - 7 * DAY_MS;
  const eligibleSevenDaySignups = signups.filter(
    (signup) => Date.parse(signup.created_at) <= sevenDayCutoff
  );
  const convertedWithinSevenDays = eligibleSevenDaySignups.filter((signup) => {
    const firstBatchAt = firstBatchAtByUser.get(signup.id);
    return firstBatchAt !== undefined &&
      firstBatchAt - Date.parse(signup.created_at) <= 7 * DAY_MS;
  }).length;

  const acquisitionCounts = new Map<string, {
    signups: number;
    firstBatchUsers: number;
    secondBatchUsers: number;
  }>();
  for (const signup of signups) {
    const source = getAcquisitionSource(signup.signup_source) ?? "unattributed";
    const counts = acquisitionCounts.get(source) ?? {
      signups: 0,
      firstBatchUsers: 0,
      secondBatchUsers: 0,
    };
    counts.signups += 1;
    const batches = batchesByUser.get(signup.id)?.length ?? 0;
    if (batches >= 1) counts.firstBatchUsers += 1;
    if (batches >= 2) counts.secondBatchUsers += 1;
    acquisitionCounts.set(source, counts);
  }
  const acquisitionSources = Array.from(acquisitionCounts, ([source, counts]) => ({
    source,
    ...counts,
    firstBatchRatePercent: counts.signups
      ? Math.round((counts.firstBatchUsers / counts.signups) * 100)
      : 0,
    secondBatchRatePercent: counts.signups
      ? Math.round((counts.secondBatchUsers / counts.signups) * 100)
      : 0,
  })).sort((a, b) => b.signups - a.signups || a.source.localeCompare(b.source));

  const retentionAfterFirstBatch = [7, 30, 90].map((days) => {
    const windowMs = days * DAY_MS;
    let eligibleUsers = 0;
    let returnedUsers = 0;
    for (const [userId, firstBatchAt] of firstBatchAtByUser) {
      if (!Number.isFinite(firstBatchAt) || firstBatchAt + windowMs > now.getTime()) continue;
      eligibleUsers += 1;
      const returned = (returnEventsByUser.get(userId) ?? []).some(
        (eventAt) =>
          eventAt >= firstBatchAt + DAY_MS &&
          eventAt <= firstBatchAt + windowMs
      );
      if (returned) returnedUsers += 1;
    }
    return {
      days,
      eligibleUsers,
      returnedUsers,
      returnRatePercent: eligibleUsers
        ? Math.round((returnedUsers / eligibleUsers) * 100)
        : 0,
    };
  });

  const featureUsage = ["Recipes", "Inventory", "Brew logs"].map((feature) => {
    let adoptedUsers = 0;
    let eligibleUsers = 0;
    let returnedUsers = 0;
    for (const [userId, features] of featureAtByUser) {
      const adoptedAt = features.get(feature);
      if (adoptedAt === undefined) continue;
      adoptedUsers += 1;
      if (adoptedAt + 30 * DAY_MS > now.getTime()) continue;
      eligibleUsers += 1;
      const returned = (returnEventsByUser.get(userId) ?? []).some(
        (eventAt) => eventAt >= adoptedAt + DAY_MS && eventAt <= adoptedAt + 30 * DAY_MS
      );
      if (returned) returnedUsers += 1;
    }
    return {
      feature,
      adoptedUsers,
      eligibleUsers,
      returnedUsers,
      returnRatePercent: eligibleUsers
        ? Math.round((returnedUsers / eligibleUsers) * 100)
        : 0,
    };
  });

  const batchProgressCounts = new Map<string, number>([
    ["Primary fermentation", 0],
    ["Secondary fermentation", 0],
    ["Conditioning", 0],
    ["Finished", 0],
    ["Other", 0],
  ]);
  for (const batch of batchRows) {
    const status = String(batch.status ?? "").toLowerCase();
    const stage = ["finished", "ferdig", "avsluttet"].includes(status)
      ? "Finished"
      : ["sekundær", "secondary"].includes(status)
        ? "Secondary fermentation"
        : status === "conditioning"
          ? "Conditioning"
          : status === "aktiv"
            ? "Primary fermentation"
            : "Other";
    batchProgressCounts.set(stage, (batchProgressCounts.get(stage) ?? 0) + 1);
  }
  const batchProgress = {
    totalBatches: batchRows.length,
    stages: Array.from(batchProgressCounts, ([stage, count]) => ({
      stage,
      count,
      percent: batchRows.length ? Math.round((count / batchRows.length) * 100) : 0,
    })),
  };

  const signupCutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  let matureTrackedUsers = 0;
  let churnedUsers = 0;
  let totalDaysBeforeChurn = 0;
  for (const activity of activityRows) {
    const signupAt = signupByUser.get(activity.user_id);
    if (!signupAt || new Date(signupAt).getTime() > signupCutoff) continue;
    matureTrackedUsers += 1;
    const lastSeenAt = new Date(activity.last_seen_at);
    if (lastSeenAt.getTime() >= signupCutoff) continue;
    churnedUsers += 1;
    totalDaysBeforeChurn += Math.max(
      0,
      (lastSeenAt.getTime() - new Date(signupAt).getTime()) / (24 * 60 * 60 * 1000)
    );
  }

  return {
    firstBatchCohorts: months.map((cohort) => ({
      month: cohort.month,
      signups: cohort.signups,
      firstBatchUsers: cohort.firstBatchUsers,
      secondBatchUsers: cohort.secondBatchUsers,
      conversionRatePercent: cohort.conversionRatePercent,
    })),
    timeToFirstBatch: {
      convertedUsers: firstBatchDurations.length,
      medianDays: median(firstBatchDurations),
      eligibleSignupsWithin7Days: eligibleSevenDaySignups.length,
      convertedWithin7Days: convertedWithinSevenDays,
      conversionWithin7DaysPercent: eligibleSevenDaySignups.length
        ? Math.round((convertedWithinSevenDays / eligibleSevenDaySignups.length) * 100)
        : 0,
    },
    acquisitionSources,
    retentionAfterFirstBatch,
    batchProgress,
    featureUsage,
    retention: {
      inactivityThresholdDays: 30,
      matureTrackedUsers,
      churnedUsers,
      churnRatePercent: matureTrackedUsers
        ? Math.round((churnedUsers / matureTrackedUsers) * 100)
        : 0,
      averageDaysBeforeChurn: churnedUsers
        ? Math.round((totalDaysBeforeChurn / churnedUsers) * 10) / 10
        : null,
    },
  };
}

async function getRowsSince(
  serviceRole: SupabaseClient,
  table: ActivitySource | "profiles",
  columns: string,
  since: string
): Promise<ActivityRecord[]> {
  const rows: ActivityRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await serviceRole
      .from(table)
      .select(columns)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + ACTIVITY_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not load recent ${table} activity: ${error.message}`);
    }

    rows.push(...((data ?? []) as unknown as ActivityRecord[]));
    if (!data || data.length < ACTIVITY_PAGE_SIZE) break;
    from += ACTIVITY_PAGE_SIZE;
  }

  return rows;
}

function countValues(records: ActivityRecord[], field: string) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = record[field];
    const label = typeof value === "string" && value.trim() ? value : "Unspecified";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

async function getActivityAnalytics(serviceRole: SupabaseClient, now: Date) {
  const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const since = twelveMonthsAgo.toISOString();
  const sources: { table: ActivitySource; columns: string; userColumn?: string }[] = [
    { table: "batches", columns: "id,user_id,type,status,volume_l,created_at", userColumn: "user_id" },
    { table: "recipes", columns: "id,user_id,type,is_public,created_at", userColumn: "user_id" },
    { table: "batch_notes", columns: "id,user_id,note_type,created_at", userColumn: "user_id" },
    { table: "forum_topics", columns: "id,author_id,category,created_at", userColumn: "author_id" },
    { table: "forum_replies", columns: "id,author_id,created_at", userColumn: "author_id" },
    { table: "sg_readings", columns: "id,created_at" },
  ];

  const [{ data: activeBatches, error: activeBatchesError }, ...sourceRows] =
    await Promise.all([
      serviceRole
        .from("batches")
        .select("id,status,volume_l")
        .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"]),
      ...sources.map(({ table, columns }) => getRowsSince(serviceRole, table, columns, since)),
    ]);

  if (activeBatchesError) {
    throw new Error(`Could not load active batch totals: ${activeBatchesError.message}`);
  }

  const recordsBySource = new Map<ActivitySource, ActivityRecord[]>(
    sources.map((source, index) => [source.table, sourceRows[index]])
  );
  const allBatches = recordsBySource.get("batches") ?? [];
  const allRecipes = recordsBySource.get("recipes") ?? [];
  const allNotes = recordsBySource.get("batch_notes") ?? [];
  const allTopics = recordsBySource.get("forum_topics") ?? [];
  const allReplies = recordsBySource.get("forum_replies") ?? [];
  const allReadings = recordsBySource.get("sg_readings") ?? [];

  const recentCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoff1d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recent = (records: ActivityRecord[]) =>
    records.filter((record) => new Date(String(record.created_at)) >= recentCutoff);
  const recentBatches = recent(allBatches);
  const recentRecipes = recent(allRecipes);
  const recentTopics = recent(allTopics);
  const recentReplies = recent(allReplies);

  const contributorsByWindow = (cutoff: Date) => {
    const contributors = new Set<string>();
    for (const source of sources) {
      if (!source.userColumn) continue;
      for (const record of recordsBySource.get(source.table) ?? []) {
        if (new Date(String(record.created_at)) < cutoff) continue;
        const id = record[source.userColumn];
        if (typeof id === "string") contributors.add(id);
      }
    }
    return contributors.size;
  };

  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(
      twelveMonthsAgo.getUTCFullYear(),
      twelveMonthsAgo.getUTCMonth() + index,
      1
    ));
    return date.toISOString().slice(0, 7);
  });
  const trend = monthKeys.map((month) => ({
    month,
    signups: 0,
    contributors: new Set<string>(),
    batches: 0,
    recipes: 0,
    brewingNotes: 0,
    forumPosts: 0,
    gravityReadings: 0,
  }));
  const monthIndex = new Map(trend.map((entry, index) => [entry.month, index]));
  const addTrend = (
    records: ActivityRecord[],
    activity: "batches" | "recipes" | "brewingNotes" | "forumPosts" | "gravityReadings",
    userColumn?: string
  ) => {
    for (const record of records) {
      const month = String(record.created_at).slice(0, 7);
      const index = monthIndex.get(month);
      if (index === undefined) continue;
      const entry = trend[index];
      entry[activity] += 1;
      if (userColumn && typeof record[userColumn] === "string") {
        entry.contributors.add(record[userColumn] as string);
      }
    }
  };
  addTrend(allBatches, "batches", "user_id");
  addTrend(allRecipes, "recipes", "user_id");
  addTrend(allNotes, "brewingNotes", "user_id");
  addTrend(allTopics, "forumPosts", "author_id");
  addTrend(allReplies, "forumPosts", "author_id");
  addTrend(allReadings, "gravityReadings");

  const signupRows = await getRowsSince(serviceRole, "profiles", "id,created_at", since);
  for (const signup of signupRows) {
    const index = monthIndex.get(String(signup.created_at).slice(0, 7));
    if (index !== undefined) trend[index].signups += 1;
  }

  const secondaryStatuses = new Set(["Sekundær", "secondary"]);
  const activeBatchRows = activeBatches ?? [];
  const activeBatchVolumeLitres = activeBatchRows.reduce((total, batch) => {
    const amount = Number(batch.volume_l);
    return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
  const recentVolume = recentBatches.reduce((total, record) => {
    const amount = Number(record.volume_l);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const recentPublicRecipes = recentRecipes.filter((record) => record.is_public === true).length;

  return {
    activeContributors: {
      last24Hours: contributorsByWindow(cutoff1d),
      last7Days: contributorsByWindow(cutoff7d),
      last30Days: contributorsByWindow(recentCutoff),
    },
    last30Days: {
      batchesStarted: recentBatches.length,
      recipesCreated: recentRecipes.length,
      publicRecipesCreated: recentPublicRecipes,
      brewingNotes: recent(allNotes).length,
      forumTopics: recentTopics.length,
      forumReplies: recentReplies.length,
      gravityReadings: recent(allReadings).length,
      batchVolumeLitres: Math.round(recentVolume * 10) / 10,
      recipeShareRate: recentRecipes.length
        ? Math.round((recentPublicRecipes / recentRecipes.length) * 100)
        : 0,
    },
    batchesByType: countValues(recentBatches, "type"),
    recipesByType: countValues(recentRecipes, "type"),
    activeBatchStatus: [
      {
        label: "Primary fermentation",
        count: activeBatchRows.filter((batch) => batch.status === "Aktiv").length,
      },
      {
        label: "Secondary fermentation",
        count: activeBatchRows.filter((batch) =>
          secondaryStatuses.has(String(batch.status))
        ).length,
      },
      {
        label: "Conditioning",
        count: activeBatchRows.filter((batch) => batch.status === "Conditioning").length,
      },
    ],
    activeBatchVolumeLitres: Math.round(activeBatchVolumeLitres * 10) / 10,
    forumTopicsByCategory: countValues(recentTopics, "category"),
    monthlyTrend: trend.map((entry) => ({
      ...entry,
      contributors: entry.contributors.size,
    })),
  };
}

export async function getAnalyticsMetrics(
  serviceRole: SupabaseClient,
  now = new Date(),
  options: { includeUserLifecycle?: boolean } = {}
) {
  const activityStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [
    { count: accounts, error: accountsError },
    { count: publicProfiles, error: publicProfilesError },
    { count: recipes, error: recipesError },
    { count: publicRecipes, error: publicRecipesError },
    { count: batches, error: batchesError },
    { count: topics, error: topicsError },
    { count: pendingReports, error: reportsError },
    { count: signups30d, error: signupsError },
    { data: analyticsRows, error: analyticsError },
  ] = await Promise.all([
    serviceRole.from("profiles").select("id", { count: "exact", head: true }),
    serviceRole.from("profiles").select("id", { count: "exact", head: true }).eq("is_public", true),
    serviceRole.from("recipes").select("id", { count: "exact", head: true }),
    serviceRole.from("recipes").select("id", { count: "exact", head: true }).eq("is_public", true),
    serviceRole.from("batches").select("id", { count: "exact", head: true }),
    serviceRole.from("forum_topics").select("id", { count: "exact", head: true }),
    serviceRole
      .from("community_reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "under_review"]),
    serviceRole
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", activityStart.toISOString()),
    serviceRole
      .from("analytics_daily")
      .select("event_type, route, event_count")
      .gte("event_date", activityStart.toISOString().slice(0, 10)),
  ]);

  const queryError =
    accountsError || publicProfilesError || recipesError || publicRecipesError ||
    batchesError || topicsError || reportsError || signupsError || analyticsError;
  if (queryError) {
    console.error("Could not load analytics totals", queryError);
    throw new Error("Could not load analytics");
  }

  let pageViews = 0;
  let signIns = 0;
  const pageViewsByRoute = new Map<string, number>();
  for (const row of analyticsRows ?? []) {
    if (row.event_type === "page_view") {
      const count = Number(row.event_count);
      pageViews += count;
      pageViewsByRoute.set(row.route, (pageViewsByRoute.get(row.route) ?? 0) + count);
    } else if (row.event_type === "sign_in") {
      signIns += Number(row.event_count);
    }
  }

  return {
    accounts: accounts ?? 0,
    publicProfiles: publicProfiles ?? 0,
    signups30d: signups30d ?? 0,
    recipes: recipes ?? 0,
    publicRecipes: publicRecipes ?? 0,
    batches: batches ?? 0,
    forumTopics: topics ?? 0,
    pendingReports: pendingReports ?? 0,
    trafficAnalytics: {
      last30Days: { pageViews, signIns },
      topPages: Array.from(pageViewsByRoute, ([route, views]) => ({ route, views }))
        .sort((a, b) => b.views - a.views || a.route.localeCompare(b.route))
        .slice(0, 8),
    },
    ...(options.includeUserLifecycle === false
      ? {}
      : { userLifecycleAnalytics: await getUserLifecycleAnalytics(serviceRole, now) }),
    activityAnalytics: await getActivityAnalytics(serviceRole, now),
  };
}
