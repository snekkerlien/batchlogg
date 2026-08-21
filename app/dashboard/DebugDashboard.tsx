"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type KarType = {
  id: string;
  status: string;
};

type DebugProps = {
  kar: KarType[];
};

export default function DebugDashboard({ kar }: DebugProps) {
  const router = useRouter();
  const [log, setLog] = useState<string[]>([]);

  function add(msg: string) {
    setLog((prev: string[]) => [...prev, msg]);
  }

  useEffect(() => {
    add("DebugDashboard mounted");
    add(`Antall kar: ${kar.length}`);

    kar.forEach((k: KarType, i: number) => {
      add(`Kar ${i + 1}: id=${k.id}, status=${k.status}`);
    });
  }, [kar]);

  function testOpen(id: string) {
    add(`Tester åpning av kar: ${id}`);
    try {
      router.push(`/kar/${id}`);
      add("router.push ble kalt");
    } catch (err: unknown) {
      if (err instanceof Error) {
        add("router.push ERROR: " + err.message);
      } else {
        add("router.push ERROR: ukjent feil");
      }
    }
  }

  return (
    <div className="bg-black/70 p-4 rounded-xl border border-white/20 mt-6">
      <h2 className="text-xl font-bold mb-2">DEBUG DASHBOARD</h2>

      <div className="space-y-2">
        {kar.map((k: KarType, index: number) => (
          <button
            key={k.id}
            onClick={() => testOpen(k.id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20"
          >
            Test åpning av Kar {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-4 bg-black/50 p-3 rounded-lg h-64 overflow-auto text-sm">
        {log.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
