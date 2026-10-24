"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  title: string;
};

type ProgressRow = {
  game_id: string;
  attempt_count: number;
  total_questions: number;
  correct_answers: number;
  best_score: number;
  last_score: number;
  missed_question_counts: Record<string, number>;
  last_played_at: string;
};

export default function LearningProgress({
  games,
}: {
  games: Game[];
}) {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const gamesById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games]
  );
  const progressByGame = useMemo(
    () => new Map(progress.map((row) => [row.game_id, row])),
    [progress]
  );

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const response = await fetch("/api/learning-progress", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) setSignedIn(false);
          return;
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load learning progress.");
        }
        if (active) {
          setProgress(result.progress);
          setSignedIn(true);
        }
      } catch (loadError) {
        console.error("Could not load Brewing Academy progress", loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load learning progress."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProgress();
    return () => {
      active = false;
    };
  }, []);

  async function resetProgress() {
    if (!window.confirm("Reset all of your Brewing Academy progress? This cannot be undone.")) {
      return;
    }
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/learning-progress", {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not reset learning progress.");
      }
      setProgress([]);
      setMessage("Your Brewing Academy progress has been reset.");
    } catch (resetError) {
      console.error("Could not reset Brewing Academy progress", resetError);
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset learning progress."
      );
    } finally {
      setResetting(false);
    }
  }

  const attempts = progress.reduce((total, row) => total + row.attempt_count, 0);
  const bestQuestionScore = progress.reduce(
    (total, row) => total + row.best_score,
    0
  );
  const missedTopics = progress
    .flatMap((row) =>
      Object.entries(row.missed_question_counts).map(([question, count]) => ({
        gameId: row.game_id,
        question,
        count,
      }))
    )
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return (
    <aside className="mb-8 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-green-200">Your progress</h2>
              <p className="mt-1 text-xs leading-5 text-white/50">
                Private to your account. Scores and missed questions help you
                choose what to revisit.
              </p>
            </div>
            {progress.length > 0 && (
              <button
                type="button"
                disabled={resetting}
                onClick={() => void resetProgress()}
                className="shrink-0 text-xs text-white/50 underline underline-offset-2 hover:text-white disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset"}
              </button>
            )}
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-white/55">Loading saved progress…</p>
          ) : !signedIn ? (
            <p className="mt-4 text-sm leading-6 text-white/60">
              Sign in to save your scores and progress across devices.
            </p>
          ) : progress.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-white/60">
              Complete a challenge to start tracking your attempts and best
              scores.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/5 p-3">
                  <p className="text-xs text-white/50">Attempts</p>
                  <p className="mt-1 text-lg font-semibold">{attempts}</p>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <p className="text-xs text-white/50">Best total</p>
                  <p className="mt-1 text-lg font-semibold">
                    {bestQuestionScore}/{progress.length * 7}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {progress.map((row) => {
                  const game = gamesById.get(row.game_id);
                  if (!game) return null;
                  return (
                    <li
                      key={row.game_id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <Link
                        href={`/games/${row.game_id}`}
                        className="min-w-0 truncate text-white/75 hover:text-green-200"
                      >
                        {game.title}
                      </Link>
                      <span className="shrink-0 text-xs text-white/50">
                        best {row.best_score}/7 ·{" "}
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(row.last_played_at))} · {row.attempt_count}{" "}
                        {row.attempt_count === 1 ? "try" : "tries"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {missedTopics.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/55">
                    Topics to revisit
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {missedTopics.map((topic) => {
                      const game = gamesById.get(topic.gameId);
                      return (
                        <li key={`${topic.gameId}-${topic.question}`}>
                          <Link
                            href={`/games/${topic.gameId}`}
                            className="block text-xs leading-5 text-white/65 hover:text-green-200"
                          >
                            {topic.question}
                            {game && (
                              <span className="ml-1 text-white/40">
                                · {game.title} · missed {topic.count}{" "}
                                {topic.count === 1 ? "time" : "times"}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
          {(error || message) && (
            <p
              role={error ? "alert" : "status"}
              className={`mt-3 text-xs ${error ? "text-amber-200" : "text-green-200"}`}
            >
              {error || message}
            </p>
          )}
    </aside>
  );
}
