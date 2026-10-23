import { ReactNode } from "react";

export default function PageHeading({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <header className="w-full min-w-0">
      <h1 className="mt-4 break-words text-center text-[clamp(1.5rem,8vw,2.25rem)] font-bold leading-tight text-green-300 sm:text-4xl">
        {title}
      </h1>
      <p className="mb-8 mt-3 break-words text-center text-white/70">{subtitle}</p>
    </header>
  );
}
