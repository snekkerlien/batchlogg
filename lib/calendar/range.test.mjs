import assert from "node:assert/strict";
import { test } from "node:test";
import { isFreeCalendarRangeAllowed } from "./range.ts";

test("free calendar queries can cover the upcoming local seven-day agenda", () => {
  const todayUtc = "2026-10-25";

  assert.equal(
    isFreeCalendarRangeAllowed("2026-10-23", "2026-11-01", todayUtc),
    true
  );
  assert.equal(
    isFreeCalendarRangeAllowed("2026-10-25", "2026-11-03", todayUtc),
    true
  );
});

test("free calendar queries cannot navigate to past or distant dates", () => {
  const todayUtc = "2026-10-25";

  assert.equal(
    isFreeCalendarRangeAllowed("2026-10-15", "2026-10-24", todayUtc),
    false
  );
  assert.equal(
    isFreeCalendarRangeAllowed("2026-10-25", "2026-11-04", todayUtc),
    false
  );
});
