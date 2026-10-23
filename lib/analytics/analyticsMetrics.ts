import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVITY_PAGE_SIZE = 1000;

type ActivitySource =
  | "batches"
  | "recipes"
  | "batch_notes"
  | "forum_topics"
  | "forum_replies"
  | "sg_readings";

type ActivityRecord = Record<string, unknown>;

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
  now = new Date()
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
  ]);

  const queryError =
    accountsError || publicProfilesError || recipesError || publicRecipesError ||
    batchesError || topicsError || reportsError || signupsError;
  if (queryError) {
    console.error("Could not load analytics totals", queryError);
    throw new Error("Could not load analytics");
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
    activityAnalytics: await getActivityAnalytics(serviceRole, now),
  };
}
