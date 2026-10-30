export default function AdminNotificationBadge({ count }: { count: number }) {
  if (count < 1) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <span
      aria-label={`${count} items need review`}
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-green-500/15 px-2 text-xs font-bold tabular-nums text-green-200 ring-1 ring-inset ring-green-400/30"
    >
      {displayCount}
    </span>
  );
}
