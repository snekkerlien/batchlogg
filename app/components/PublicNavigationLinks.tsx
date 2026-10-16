import Link from "next/link";

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
        About
      </Link>
      <Link href="/contact" className="hover:text-white hover:underline">
        Contact
      </Link>
      <Link href="/recipes" className="hover:text-white hover:underline">
        Public recipes
      </Link>
      <Link href="/abv-tools" className="hover:text-white hover:underline">
        ABV tools
      </Link>
      {showAuthLinks && (
        <>
          <Link href="/auth/login" className="hover:text-white hover:underline">
            Log in
          </Link>
          <Link href="/auth/signup" className="hover:text-white hover:underline">
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}
