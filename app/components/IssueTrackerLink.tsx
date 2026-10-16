"use client";

import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

const ISSUE_TRACKER_URL = "https://github.com/snekkerlien/batchlogg/issues";

export default function IssueTrackerLink({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isTauri()) return;
    event.preventDefault();
    setError("");
    try {
      await openUrl(ISSUE_TRACKER_URL);
    } catch (openError) {
      console.error("Could not open the GitHub issue tracker", openError);
      setError("Could not open GitHub. Please try again.");
    }
  }

  return (
    <>
      <a
        href={ISSUE_TRACKER_URL}
        target="_blank"
        rel="noreferrer"
        onClick={handleClick}
        className={className}
      >
        {children}
      </a>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
