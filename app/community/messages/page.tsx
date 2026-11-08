import { Suspense } from "react";
import TranslatedText from "@/app/components/TranslatedText";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white">
          <TranslatedText text="Loading messages…" />
        </main>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
