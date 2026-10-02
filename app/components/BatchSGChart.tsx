"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface BatchSGChartProps {
  readings: Array<{
    sg: number | string;
    created_at: string;
  }>;
}

export default function BatchSGChart({ readings }: BatchSGChartProps) {
  return (
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
          },
        ],
      }}
      options={{
        responsive: true,
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
  );
}
