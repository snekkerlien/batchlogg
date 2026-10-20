const SG_REMINDER_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type GravityReminderBatch = {
  id: string;
  name: string | null;
  startdato: string | null;
  created_at: string;
  status: string;
};

export type GravityReminderReading = {
  id: string;
  batch_id: string | null;
  created_at: string;
  sg: number | string;
};

export type GravityReminder = {
  user_id: string;
  batch_id: string;
  source_reading_id: string | null;
  stale_key: string;
  type: "sg_check";
  message: string;
  remind_at: string;
};

export function buildGravityReminders(
  userId: string,
  batches: GravityReminderBatch[],
  readings: GravityReminderReading[],
  now: number
): { staleReadingReminders: GravityReminder[]; stableGravityReminders: GravityReminder[] } {
  const latestReadingByBatch = new Map<string, GravityReminderReading>();
  const readingsByBatch = new Map<string, GravityReminderReading[]>();

  for (const reading of readings) {
    if (!reading.batch_id) continue;
    if (!latestReadingByBatch.has(reading.batch_id)) {
      latestReadingByBatch.set(reading.batch_id, reading);
    }
    const batchReadings = readingsByBatch.get(reading.batch_id) ?? [];
    if (batchReadings.length < 3) batchReadings.push(reading);
    readingsByBatch.set(reading.batch_id, batchReadings);
  }

  const staleReadingReminders = batches.flatMap((batch) => {
    const latestReading = latestReadingByBatch.get(batch.id);
    const anchorDate =
      latestReading?.created_at || batch.startdato || batch.created_at;
    const anchorTime = new Date(anchorDate).getTime();
    if (
      !Number.isFinite(anchorTime) ||
      now - anchorTime < SG_REMINDER_AFTER_DAYS * DAY_MS
    ) {
      return [];
    }

    const stageLabel = ["sekundær", "secondary"].includes(
      String(batch.status ?? "").toLowerCase()
    )
      ? "secondary fermentation"
      : "primary fermentation";

    return [{
      user_id: userId,
      batch_id: batch.id,
      source_reading_id: latestReading?.id ?? null,
      stale_key: latestReading ? `reading:${latestReading.id}` : "initial",
      type: "sg_check" as const,
      message: `No gravity reading has been logged for "${batch.name || "this batch"}" during ${stageLabel} in 7 days. Consider taking a gravity reading.`,
      remind_at: new Date(anchorTime + SG_REMINDER_AFTER_DAYS * DAY_MS).toISOString(),
    }];
  });

  const stableGravityReminders = batches.flatMap((batch) => {
    const recentReadings = readingsByBatch.get(batch.id) ?? [];
    if (recentReadings.length < 3) return [];
    const values = recentReadings.map((reading) => Number(reading.sg));
    if (values.some((value) => !Number.isFinite(value) || value < 0.8 || value > 1.3)) {
      return [];
    }
    const latestTime = new Date(recentReadings[0].created_at).getTime();
    const oldestTime = new Date(recentReadings[2].created_at).getTime();
    const gravitySpread = Math.max(...values) - Math.min(...values);
    if (
      !Number.isFinite(latestTime) ||
      !Number.isFinite(oldestTime) ||
      latestTime - oldestTime < 2 * DAY_MS ||
      now - latestTime >= SG_REMINDER_AFTER_DAYS * DAY_MS ||
      gravitySpread > 0.001 + Number.EPSILON * 2
    ) {
      return [];
    }

    const stageLabel = ["sekundær", "secondary"].includes(
      String(batch.status ?? "").toLowerCase()
    )
      ? "secondary fermentation"
      : "primary fermentation";
    return [{
      user_id: userId,
      batch_id: batch.id,
      source_reading_id: null,
      stale_key: `stable:${recentReadings[0].id}`,
      type: "sg_check" as const,
      message: `Gravity for "${batch.name || "this batch"}" has stayed within 0.001 across three readings during ${stageLabel}. Consider confirming the trend with another reading before treating fermentation as complete.`,
      remind_at: new Date(now).toISOString(),
    }];
  });

  return { staleReadingReminders, stableGravityReminders };
}
