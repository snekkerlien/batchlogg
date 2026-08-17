"use client";

import DeleteModal from "./DeleteModal";

export default function DeleteBatchButton({ batchnummer }: { batchnummer: string }) {
  return <DeleteModal batchnummer={batchnummer} />;
}
