import Link from "next/link";
import TranslatedText from "./TranslatedText";

export default function PublicNavigationLinks({
  className = "flex flex-wrap items-center gap-x-4 gap-y-2 text-white/75",
  showAuthLinks = true,
}: {
  className?: string;
  showAuthLinks?: boolean;
}) {
  return (
    <div className={className}>
      <Link href="/about" className="hover:text-white hover:underline">
        <TranslatedText text="About" />
      </Link>
      <Link href="/contact" className="hover:text-white hover:underline">
        <TranslatedText text="Contact" />
      </Link>
      <Link href="/recipes" className="hover:text-white hover:underline">
        <TranslatedText text="Public recipes" />
      </Link>
      <Link href="/business" className="hover:text-white hover:underline">
        <TranslatedText text="Beer & Brewing Reviews" />
      </Link>
      <Link href="/abv-tools" className="hover:text-white hover:underline">
        <TranslatedText text="ABV tools" />
      </Link>
      <Link href="/games" className="hover:text-white hover:underline">
        <TranslatedText text="Brewing Academy" />
      </Link>
      {showAuthLinks && (
        <>
          <Link href="/auth/login" className="hover:text-white hover:underline">
            <TranslatedText text="Log in" />
          </Link>
          <Link href="/auth/signup" className="hover:text-white hover:underline">
            <TranslatedText text="Sign up" />
          </Link>
        </>
      )}
    </div>
  );
}
