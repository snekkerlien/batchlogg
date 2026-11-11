import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDefaultChecklistState,
  filterChecklistForSteps,
  getBrewDaySteps,
} from "./brewDayChecklist.ts";

test("all-grain beer keeps its mash, sparge, and boil timers", () => {
  const steps = getBrewDaySteps("Beer", "all_grain");
  assert.equal(steps.find((step) => step.id === "mash")?.timerMinutes, 60);
  assert.equal(steps.find((step) => step.id === "sparge")?.timerMinutes, 15);
  assert.equal(steps.find((step) => step.id === "boil")?.timerMinutes, 60);
  assert.equal(steps.find((step) => step.id === "chill")?.timerMinutes, 20);
});

test("fresh wort and malt extract kits do not show a boil step or any timers", () => {
  const freshWortSteps = getBrewDaySteps("Beer", "fresh_wort_kit");
  const maltExtractSteps = getBrewDaySteps("Beer", "malt_extract_kit");

  assert.ok(freshWortSteps.some((step) => step.id === "prepare-wort"));
  assert.ok(maltExtractSteps.some((step) => step.id === "prepare-wort"));
  assert.equal(freshWortSteps.some((step) => step.id === "boil"), false);
  assert.equal(maltExtractSteps.some((step) => step.id === "boil"), false);
  assert.equal(freshWortSteps.some((step) => step.id === "chill"), false);
  assert.equal(maltExtractSteps.some((step) => step.id === "chill"), false);
  assert.equal(freshWortSteps.some((step) => step.timerMinutes !== undefined), false);
  assert.equal(maltExtractSteps.some((step) => step.timerMinutes !== undefined), false);
});

test("saved timers are removed only when their step is no longer timed", () => {
  const state = {
    ...createDefaultChecklistState(),
    completed: ["prepare", "boil", "chill"],
    timer: { stepId: "chill", endsAt: null, remainingMs: 120000 },
  };
  for (const subtype of ["fresh_wort_kit", "malt_extract_kit"]) {
    const filtered = filterChecklistForSteps(state, getBrewDaySteps("Beer", subtype));
    assert.deepEqual(filtered.completed, ["prepare"]);
    assert.equal(filtered.timer, null);
    assert.deepEqual(filtered.durations, state.durations);
  }
  const allGrain = filterChecklistForSteps(state, getBrewDaySteps("Beer", "all_grain"));
  assert.deepEqual(allGrain.completed, state.completed);
  assert.deepEqual(allGrain.timer, state.timer);
});
