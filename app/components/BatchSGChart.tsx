"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ActiveElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import SGReadingsList from "@/app/components/SGReadingsList";
import {
  type SGReading,
  useSGReadingDeletion,
} from "@/app/components/useSGReadingDeletion";
import { useTranslation } from "@/lib/i18n/useTranslation";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface BatchSGChartProps {
  readings: SGReading[];
  batchId: string;
  onDeleted: (readingId: string) => void;
}

export default function BatchSGChart({
  readings,
  batchId,
  onDeleted,
}: BatchSGChartProps) {
  const { t, language } = useTranslation();
  const [selected, setSelected] = useState<{
    id: string;
    x: number;
    y: number;
    pinned: boolean;
  } | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mouseInsideRef = useRef(false);
  const hoverCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { requestDeletion, deleteError, dialog } = useSGReadingDeletion(
    batchId,
    (readingId) => {
      setSelected(null);
      onDeleted(readingId);
    }
  );
  const selectedReading = readings.find((reading) => reading.id === selected?.id);

  useEffect(() => {
    if (!selected) return;

    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !graphRef.current?.contains(event.target)) {
        mouseInsideRef.current = false;
        setSelected(null);
      }
    }

    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [selected]);

  useEffect(() => () => {
    if (hoverCloseRef.current !== null) clearTimeout(hoverCloseRef.current);
  }, []);

  function cancelHoverClose() {
    if (hoverCloseRef.current !== null) {
      clearTimeout(hoverCloseRef.current);
      hoverCloseRef.current = null;
    }
  }

  function scheduleHoverClose() {
    cancelHoverClose();
    hoverCloseRef.current = setTimeout(() => {
      if (!popupRef.current?.matches(":hover, :focus-within")) {
        setSelected((current) => current?.pinned ? current : null);
      }
      hoverCloseRef.current = null;
    }, 200);
  }

  function selectPoint(elements: ActiveElement[], chart: ChartJS, pinned: boolean) {
    if (!pinned && !mouseInsideRef.current) return;
    const point = elements[0];
    const reading = point && readings[point.index];
    if (!point || !reading) {
      if (pinned) {
        cancelHoverClose();
        setSelected(null);
      } else {
        scheduleHoverClose();
      }
      return;
    }
    cancelHoverClose();
    const x = Math.max(15, Math.min(85, (point.element.x / chart.width) * 100));
    const y = Math.max(0, Math.min(85, (point.element.y / chart.height) * 100));
    setSelected((current) => {
      if (!pinned && current?.pinned) return current;
      if (
        current?.id === reading.id &&
        current.x === x &&
        current.y === y &&
        current.pinned === pinned
      ) return current;
      return { id: reading.id, x, y, pinned };
    });
  }

  return (
    <>
      <div
        ref={graphRef}
        className="relative"
        onMouseEnter={() => { mouseInsideRef.current = true; }}
        onMouseLeave={() => {
          mouseInsideRef.current = false;
          scheduleHoverClose();
        }}
      >
        <Line
          data={{
            labels: readings.map((reading) =>
              new Date(reading.created_at).toLocaleDateString()
            ),
            datasets: [
              {
                data: readings.map((reading) => Number(reading.sg)),
                borderColor: "rgb(75, 192, 192)",
                tension: 0,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHitRadius: 14,
              },
            ],
          }}
          options={{
            responsive: true,
            onHover: (_event, elements, chart) => selectPoint(elements, chart, false),
            onClick: (_event, elements, chart) => selectPoint(elements, chart, true),
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => Number(context.raw).toFixed(3),
                },
              },
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => Number(value).toFixed(3),
                },
              },
            },
          }}
        />
        {selected && selectedReading && (
          <div
            ref={popupRef}
            className="absolute z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/20 bg-zinc-900 p-2 text-sm shadow-lg"
            style={{ left: `${selected.x}%`, top: `${selected.y}%` }}
            onMouseEnter={cancelHoverClose}
            onMouseLeave={scheduleHoverClose}
          >
            <span className="whitespace-nowrap font-mono">
              {Number(selectedReading.sg).toFixed(3)}
            </span>
            <button
              type="button"
              onClick={() => requestDeletion(selectedReading)}
              aria-label={`${t("Delete gravity reading")}: ${Number(selectedReading.sg).toFixed(3)}, ${new Date(selectedReading.created_at).toLocaleString(language === "nb" ? "nb-NO" : "en-GB")}`}
              className="min-h-11 rounded-lg border border-red-300/30 px-3 text-xs font-semibold text-red-200 hover:bg-red-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300"
            >
              {t("Delete")}
            </button>
          </div>
        )}
      </div>
      {deleteError && (
        <p role="alert" className="mt-3 text-sm text-red-300">{deleteError}</p>
      )}
      {dialog}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-green-200 underline">
          {t("Recorded readings")}
        </summary>
        <div className="mt-3">
          <SGReadingsList batchId={batchId} readings={readings} onDeleted={onDeleted} />
        </div>
      </details>
    </>
  );
}
