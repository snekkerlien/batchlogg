import type { ReactNode } from "react";
import ClientLayout from "./ClientLayout";

export default function UiLayout({ children }: { children: ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
