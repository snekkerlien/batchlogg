"use client";

import { useRouter } from "next/navigation";
import { createBatch } from "../../actions/createBatch";
import { useTranslation } from "@/lib/i18n/useTranslation";

type KarType = {
  id: string;        // UUID
  nummer: number;    // auto-increment INT
  created_at: string;
  status: string;
};

type KarClientProps = {
  kar: KarType;
};

export default function KarClient({ kar }: KarClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <form
      action={async (formData) => {
        // Send UUID to server action
        formData.set("kar", kar.id);

        const result = await createBatch(formData);
        if (result.showFirstBatchGuide) {
          router.push(`/kar/${kar.id}?guide=first-batch`);
        } else {
          router.refresh();
        }
      }}
      className="space-y-4 text-white"
    >
      {/* Hidden field for vessel ID (UUID) */}
      <input type="hidden" name="kar" value={kar.id} />

      <div>
        <label className="block mb-1">{t("Batch name")}</label>
        <input
          type="text"
          name="name"
          required
          placeholder={t("Enter batch name")}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">{t("Volume (liters)")}</label>
        <input
          type="number"
          name="volume_l"
          required
          placeholder={t("Enter volume in liters")}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">{t("Brew date")}</label>
        <input
          type="date"
          name="startdato"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">{t("Original Gravity (OG)")}</label>
        <input
          type="number"
          step="0.001"
          name="og"
          required
          placeholder={t("Enter original gravity")}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
      >
        {t("Register batch")}
      </button>
    </form>
  );
}
