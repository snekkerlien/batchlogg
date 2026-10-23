"use client";

export default function BreweryProductLink({
  productId,
  href,
}: {
  productId: string;
  href: string;
}) {
  function recordClick() {
    void fetch("/api/brewery/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, source: "outbound_click" }),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) console.error("Could not record shop click", response.status);
      })
      .catch((error: unknown) => {
        console.error("Could not record shop click", error);
      });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={recordClick}
      className="text-green-200 underline underline-offset-4"
    >
      Visit product page
    </a>
  );
}
