"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const PIECE_COLORS = [
  "from-cyan-300 via-cyan-500 to-cyan-800",
  "from-amber-200 via-amber-500 to-amber-800",
  "from-purple-300 via-purple-500 to-purple-900",
  "from-blue-300 via-blue-500 to-blue-900",
  "from-orange-200 via-orange-500 to-orange-900",
  "from-green-200 via-green-500 to-green-900",
  "from-red-300 via-red-500 to-red-900",
];

const PIECES = [
  { shape: [[1, 1, 1, 1]], itemId: 1 },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    itemId: 2,
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    itemId: 3,
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    itemId: 4,
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    itemId: 5,
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    itemId: 6,
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    itemId: 7,
  },
];

type Piece = {
  shape: number[][];
  itemId: number;
  x: number;
  y: number;
};

type BoardCell = number | null;

type GameState = {
  board: BoardCell[][];
  piece: Piece | null;
  playing: boolean;
  gameOver: boolean;
  score: number;
  lines: number;
};

type HighScoreStatus = "loading" | "saved" | "saving" | "error" | "signed-out";

type GameAction =
  | { type: "start"; piece: Piece }
  | { type: "pause" }
  | { type: "move"; dx: number; dy: number; nextPiece: Piece }
  | { type: "rotate" }
  | { type: "drop"; nextPiece: Piece };

const EMPTY_BOARD = (): BoardCell[][] =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

const INITIAL_STATE: GameState = {
  board: EMPTY_BOARD(),
  piece: null,
  playing: false,
  gameOver: false,
  score: 0,
  lines: 0,
};

function createPiece(): Piece {
  const selected = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: selected.shape,
    itemId: selected.itemId,
    x: Math.floor((BOARD_WIDTH - selected.shape[0].length) / 2),
    y: 0,
  };
}

function canPlace(board: BoardCell[][], piece: Piece, x: number, y: number) {
  return piece.shape.every((row, rowIndex) =>
    row.every((cell, columnIndex) => {
      if (!cell) return true;
      const nextX = x + columnIndex;
      const nextY = y + rowIndex;
      return (
        nextX >= 0 &&
        nextX < BOARD_WIDTH &&
        nextY < BOARD_HEIGHT &&
        (nextY < 0 || board[nextY][nextX] === null)
      );
    })
  );
}

function finishPiece(
  state: GameState,
  nextPiece: Piece
): GameState {
  if (!state.piece) return state;
  const board = state.board.map((row) => [...row]);
  let reachedTop = false;

  state.piece.shape.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (!cell) return;
      const y = state.piece!.y + rowIndex;
      if (y < 0) {
        reachedTop = true;
      } else {
        board[y][state.piece!.x + columnIndex] = state.piece!.itemId;
      }
    });
  });

  if (reachedTop) {
    return { ...state, board, piece: null, playing: false, gameOver: true };
  }

  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_HEIGHT - remainingRows.length;
  const nextBoard = [
    ...Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(null)),
    ...remainingRows,
  ];
  const spawnedPiece = { ...nextPiece, y: 0 };
  const blocked = !canPlace(nextBoard, spawnedPiece, spawnedPiece.x, spawnedPiece.y);

  return {
    ...state,
    board: nextBoard,
    piece: blocked ? null : spawnedPiece,
    playing: !blocked,
    gameOver: blocked,
    score: state.score + [0, 100, 300, 500, 800][cleared],
    lines: state.lines + cleared,
  };
}

function rotate(shape: number[][]) {
  return shape[0].map((_, columnIndex) =>
    shape.map((row) => row[columnIndex]).reverse()
  );
}

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "start") {
    return {
      ...INITIAL_STATE,
      board: EMPTY_BOARD(),
      piece: action.piece,
      playing: true,
    };
  }
  if (action.type === "pause") {
    return state.gameOver || !state.piece
      ? state
      : { ...state, playing: !state.playing };
  }
  if (!state.playing || !state.piece) return state;

  if (action.type === "move") {
    if (canPlace(state.board, state.piece, state.piece.x + action.dx, state.piece.y + action.dy)) {
      return {
        ...state,
        piece: { ...state.piece, x: state.piece.x + action.dx, y: state.piece.y + action.dy },
      };
    }
    return action.dy > 0 ? finishPiece(state, action.nextPiece) : state;
  }

  if (action.type === "rotate") {
    const shape = rotate(state.piece.shape);
    const rotated = { ...state.piece, shape };
    const wallKick = [0, -1, 1, -2, 2].find((offset) =>
      canPlace(state.board, rotated, rotated.x + offset, rotated.y)
    );
    return wallKick === undefined
      ? state
      : { ...state, piece: { ...rotated, x: rotated.x + wallKick } };
  }

  let dropY = state.piece.y;
  while (canPlace(state.board, state.piece, state.piece.x, dropY + 1)) {
    dropY += 1;
  }
  return finishPiece(
    { ...state, piece: { ...state.piece, y: dropY } },
    action.nextPiece
  );
}

export default function KegTetrisPage() {
  const [game, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [highScoreStatus, setHighScoreStatus] = useState<HighScoreStatus>("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/keg-tetris/score", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setHighScoreStatus("signed-out");
          return;
        }
        const result: { highScore?: number | null; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load your high score.");
        }
        if (active) {
          setHighScore(result.highScore ?? null);
          setHighScoreStatus("saved");
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load Keg Tetris high score", error);
        if (active) setHighScoreStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!game.gameOver) return;
    let active = true;
    setHighScoreStatus("saving");
    fetch("/api/keg-tetris/score", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: game.score }),
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setHighScoreStatus("signed-out");
          return;
        }
        const result: { highScore?: number; error?: string } =
          await response.json();
        if (!response.ok || typeof result.highScore !== "number") {
          throw new Error(result.error || "Could not save your high score.");
        }
        if (active) {
          setHighScore(result.highScore);
          setHighScoreStatus("saved");
        }
      })
      .catch((error: unknown) => {
        console.error("Could not save Keg Tetris high score", error);
        if (active) setHighScoreStatus("error");
      });
    return () => {
      active = false;
    };
  }, [game.gameOver, game.score]);

  useEffect(() => {
    if (!game.playing) return;
    const timer = window.setInterval(() => {
      dispatch({ type: "move", dx: 0, dy: 1, nextPiece: createPiece() });
    }, 650);
    return () => window.clearInterval(timer);
  }, [game.playing]);

  useEffect(() => {
    if (!game.playing) return;
    function handleKeyDown(event: KeyboardEvent) {
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
        ArrowDown: [0, 1],
        s: [0, 1],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        dispatch({ type: "move", dx: move[0], dy: move[1], nextPiece: createPiece() });
      } else if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        dispatch({ type: "rotate" });
      } else if (event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "drop", nextPiece: createPiece() });
      } else if (event.key.toLowerCase() === "p" || event.key === "Escape") {
        dispatch({ type: "pause" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.playing]);

  const visibleBoard = game.board.map((row) => [...row]);
  if (game.piece) {
    game.piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const x = game.piece!.x + columnIndex;
        const y = game.piece!.y + rowIndex;
        if (cell && y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          visibleBoard[y][x] = game.piece!.itemId;
        }
      });
    });
  }

  function startGame() {
    dispatch({ type: "start", piece: createPiece() });
  }

  function movePiece(dx: number, dy: number) {
    dispatch({ type: "move", dx, dy, nextPiece: createPiece() });
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="keg-tetris" />
        </div>

        <PageHeading
          title="Keg Tetris"
          subtitle="Stack the kegs, clear the rows, and keep brew day moving."
        />

        <div className="mx-auto grid max-w-xl gap-6 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="mx-auto w-full max-w-[18rem]">
            <div
              role="img"
              aria-label="Keg Tetris game board"
              className="grid aspect-[1/2] w-full grid-cols-10 grid-rows-[repeat(20,minmax(0,1fr))] overflow-hidden rounded-lg border border-white/20 bg-zinc-950 p-1"
            >
              {visibleBoard.flatMap((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    aria-hidden="true"
                    className={`m-[1px] min-h-0 min-w-0 rounded-[3px] border ${
                      cell
                        ? `border-white/45 bg-gradient-to-br ${PIECE_COLORS[cell - 1]} shadow-[inset_1px_1px_2px_rgba(255,255,255,0.45),inset_-2px_-2px_3px_rgba(0,0,0,0.35)]`
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  />
                ))
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/55">Score</p>
                <p aria-live="polite" className="mt-1 text-2xl font-semibold text-green-200">
                  {game.score}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/55">Rows cleared</p>
                <p className="mt-1 text-2xl font-semibold text-green-200">{game.lines}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-3 sm:col-span-1">
                <p className="text-xs text-white/55">Personal best</p>
                <p className="mt-1 text-2xl font-semibold text-amber-200">
                  {highScore ?? "—"}
                </p>
                <p role="status" className="mt-1 text-xs text-white/45">
                  {highScoreStatus === "loading"
                    ? "Loading saved score…"
                    : highScoreStatus === "saving"
                      ? "Saving score…"
                      : highScoreStatus === "error"
                        ? "Could not sync score. Try again later."
                        : highScoreStatus === "signed-out"
                          ? (
                            <>
                              <Link href="/auth/login" className="underline underline-offset-2">
                                Log in
                              </Link>{" "}
                              to save across devices.
                            </>
                          )
                          : highScore === null
                            ? "Your best score will appear after your first game."
                            : "Saved to your account"}
                </p>
              </div>
            </div>

            {game.gameOver ? (
              <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-950/30 p-3 text-sm text-amber-100">
                The stack is full. Give it another go!
              </p>
            ) : !game.playing && game.piece ? (
              <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                Game paused.
              </p>
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                Fit the falling blocks together to clear a full row.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {!game.playing ? (
                <button
                  type="button"
                  onClick={
                    game.piece && !game.gameOver
                      ? () => dispatch({ type: "pause" })
                      : startGame
                  }
                  className="min-h-11 flex-1 rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
                >
                  {game.gameOver
                    ? "Play again"
                    : game.piece
                      ? "Resume"
                      : "Start game"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "pause" })}
                  className="min-h-11 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
                >
                  Pause
                </button>
              )}
            </div>

            <div className="hidden rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/55 sm:block">
              <h2 className="mb-1 font-semibold text-white/80">Keyboard</h2>
              <p>← → or A / D: move</p>
              <p>↑ or W: rotate</p>
              <p>↓ or S: drop faster</p>
              <p>Space: drop piece</p>
              <p>P or Esc: pause</p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:hidden">
              <span />
              <button type="button" aria-label="Rotate piece" onClick={() => dispatch({ type: "rotate" })} disabled={!game.playing} className="min-h-11 rounded-lg border border-white/20 bg-white/10 text-lg disabled:opacity-40">↻</button>
              <span />
              <button type="button" aria-label="Move piece left" onClick={() => movePiece(-1, 0)} disabled={!game.playing} className="min-h-11 rounded-lg border border-white/20 bg-white/10 text-lg disabled:opacity-40">←</button>
              <button type="button" aria-label="Drop piece faster" onClick={() => movePiece(0, 1)} disabled={!game.playing} className="min-h-11 rounded-lg border border-white/20 bg-white/10 text-lg disabled:opacity-40">↓</button>
              <button type="button" aria-label="Move piece right" onClick={() => movePiece(1, 0)} disabled={!game.playing} className="min-h-11 rounded-lg border border-white/20 bg-white/10 text-lg disabled:opacity-40">→</button>
              <button type="button" onClick={() => dispatch({ type: "drop", nextPiece: createPiece() })} disabled={!game.playing} className="col-span-3 min-h-11 rounded-lg border border-white/20 bg-white/10 text-sm font-semibold disabled:opacity-40">Drop</button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
