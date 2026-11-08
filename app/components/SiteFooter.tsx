import Link from "next/link";
import TranslatedText from "./TranslatedText";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-10 flex w-full flex-col items-center gap-y-3 px-6 pb-8 text-sm text-white/60">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/about" className="underline hover:text-white">
          <TranslatedText text="About" />
        </Link>
        <Link href="/contact" className="underline hover:text-white">
          <TranslatedText text="Contact" />
        </Link>
        <Link href="/changelog" className="underline hover:text-white">
          <TranslatedText text="Changelogs" />
        </Link>
        <Link href="/privacy" className="underline hover:text-white">
          <TranslatedText text="Privacy Policy" />
        </Link>
        <Link href="/terms" className="underline hover:text-white">
          <TranslatedText text="Terms of Service" />
        </Link>
      </nav>
      <span>© {new Date().getFullYear()} Batchlogg</span>
    </footer>
  );
}
