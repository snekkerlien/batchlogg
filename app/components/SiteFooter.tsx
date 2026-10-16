import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-10 flex w-full flex-col items-center gap-y-3 px-6 pb-8 text-sm text-white/60">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/about" className="underline hover:text-white">
          About
        </Link>
        <Link href="/contact" className="underline hover:text-white">
          Contact
        </Link>
        <Link href="/privacy" className="underline hover:text-white">
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline hover:text-white">
          Terms of Service
        </Link>
      </nav>
      <span>© {new Date().getFullYear()} Batchlogg</span>
    </footer>
  );
}
