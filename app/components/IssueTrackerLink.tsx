"use client";

const ISSUE_TRACKER_URL = "https://github.com/snekkerlien/batchlogg/issues";

export default function IssueTrackerLink({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a href={ISSUE_TRACKER_URL} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
