const DAY_IN_MS = 24 * 60 * 60 * 1000;

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function isFreeCalendarRangeAllowed(
  from: string,
  to: string,
  todayUtc: string
) {
  const rangeDays =
    (Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)) /
    DAY_IN_MS;

  return (
    from >= shiftDate(todayUtc, -2) &&
    from <= todayUtc &&
    to >= shiftDate(todayUtc, 7) &&
    to <= shiftDate(todayUtc, 9) &&
    rangeDays <= 9
  );
}
