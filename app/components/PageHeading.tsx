import { ReactNode } from "react";

export default function PageHeading({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <header>
      <h1 className="mt-4 text-center text-4xl font-bold text-green-300">
        {title}
      </h1>
      <p className="mb-8 mt-3 text-center text-white/70">{subtitle}</p>
    </header>
  );
}
