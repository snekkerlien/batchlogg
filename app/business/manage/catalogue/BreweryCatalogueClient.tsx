"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import BackButton from "@/app/components/BackButton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import ProductCardTitle from "@/app/business/ProductCardTitle";
import { getErrorMessage, saveDownload } from "@/lib/desktopDownloads";

const inputClass = "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white";
const publicAppOrigin = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? "https://batchlogg.vercel.app"
).origin;
const categories = [
  ["all-grain-kit", "All-grain kit"],
  ["fresh-wort-kit", "Fresh wort kit"],
  ["malt-extract-kit", "Malt extract kit"],
  ["beer", "Beer"],
  ["cider", "Cider"],
  ["mead", "Mead"],
  ["wine", "Wine"],
  ["spirits", "Spirits"],
  ["non-alcoholic", "Non-alcoholic"],
  ["brewing-equipment", "Brewing equipment"],
  ["brewing-ingredients", "Brewing ingredients"],
  ["merchandise", "Merchandise"],
  ["other", "Other"],
] as const;
const beverageCategories = categories.filter(([value]) =>
  ["beer", "cider", "mead", "wine", "spirits", "non-alcoholic"].includes(value)
);
const beerKitCategories = categories.filter(([value]) =>
  ["all-grain-kit", "fresh-wort-kit", "malt-extract-kit"].includes(value)
);

type ProductForm = {
  name: string;
  category: string;
  style: string;
  brewedBy: string;
  batchSizeLiters: string;
  abv: string;
  ebc: string;
  ibu: string;
  packageSize: string;
  price: string;
  priceCurrency: string;
  availability: string;
  productUrl: string;
  description: string;
  isPublished: boolean;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  is_published: boolean;
  analytics: { pageViews: number; qrScans: number };
};

type Account = {
  name: string;
  slug: string;
  business_type: string;
  hasAccess: boolean;
  role: string | null;
  isOwner: boolean;
};

const initialProduct: ProductForm = {
  name: "",
  category: "all-grain-kit",
  style: "",
  brewedBy: "",
  batchSizeLiters: "",
  abv: "",
  ebc: "",
  ibu: "",
  packageSize: "",
  price: "",
  priceCurrency: "",
  availability: "available",
  productUrl: "",
  description: "",
  isPublished: true,
};

function productForm(product: Product & Record<string, unknown>): ProductForm {
  const details = typeof product.details === "object" && product.details !== null
    ? product.details as Record<string, unknown>
    : {};
  return {
    name: product.name,
    category: product.category,
    style: String(product.style ?? ""),
    brewedBy: String(details.brewed_by ?? ""),
    batchSizeLiters: String(product.batch_size_l ?? ""),
    abv: String(product.abv ?? ""),
    ebc: String(product.ebc ?? ""),
    ibu: String(product.ibu ?? ""),
    packageSize: String(product.package_size ?? ""),
    price: String(product.price ?? ""),
    priceCurrency: String(product.price_currency ?? ""),
    availability: String(product.availability ?? "available"),
    productUrl: String(product.product_url ?? ""),
    description: product.description ?? "",
    isPublished: product.is_published,
  };
}

export default function BreweryCatalogueClient() {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [products, setProducts] = useState<(Product & Record<string, unknown>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productKind, setProductKind] = useState<"kit" | "beverage" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [qrProductId, setQrProductId] = useState<string | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [product, setProduct] = useState<ProductForm>(initialProduct);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [priceSuggestionMessage, setPriceSuggestionMessage] = useState("");

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(selectedImage);
    setSelectedImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  const load = useCallback(async () => {
    setLoadFailed(false);
    const response = await fetch("/api/brewery/me", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json();
    if (response.status === 401) setNeedsLogin(true);
    if (!response.ok) throw new Error(data.error || "Could not load your product catalogue.");
    setNeedsLogin(false);
    setAccount(data.account ?? null);
    const canManage = Boolean(
      data.account?.hasAccess &&
      (data.account?.isOwner || data.account?.role === "manager" || data.account?.role === "editor")
    );
    setProducts(canManage ? data.products ?? [] : []);
  }, []);

  useEffect(() => {
    load()
      .catch((loadError) => {
        console.error("Could not load brewery product catalogue", loadError);
        setLoadFailed(true);
        setError(loadError instanceof Error ? loadError.message : "Could not load your product catalogue.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const productRequest = new FormData();
      productRequest.append("product", JSON.stringify({
        ...product,
        details: { brewed_by: product.brewedBy.trim() || null },
      }));
      if (selectedImage) productRequest.append("image", selectedImage);
      if (removeImage) productRequest.append("removeImage", "true");
      const response = await fetch(
        editingId ? `/api/brewery/products/${editingId}` : "/api/brewery/products",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          body: productRequest,
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save product.");
      await load();
      setEditingId(null);
      setProduct(initialProduct);
      setProductKind(null);
      setProductModalOpen(false);
      setSelectedImage(null);
      setCurrentImageUrl("");
      setRemoveImage(false);
      setImageInputKey((key) => key + 1);
      setNotice(editingId ? "Product updated." : "Product added.");
    } catch (saveError) {
      console.error("Could not save brewery product", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function suggestPriceFromLink() {
    setSuggestingPrice(true);
    setPriceSuggestionMessage("");
    try {
      const response = await fetch("/api/brewery/products/detect-price", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: product.productUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not suggest a price from this link.");
      if (
        typeof result.price?.amount !== "number" ||
        typeof result.price?.currency !== "string"
      ) {
        throw new Error("The product page did not return a valid price suggestion.");
      }
      setProduct((current) => ({
        ...current,
        price: String(result.price.amount),
        priceCurrency: result.price.currency,
      }));
      setPriceSuggestionMessage("Suggested price filled in. Verify it before saving.");
    } catch (suggestionError) {
      console.error("Could not suggest product price", suggestionError);
      setPriceSuggestionMessage(
        suggestionError instanceof Error
          ? suggestionError.message
          : "Could not suggest a price from this link."
      );
    } finally {
      setSuggestingPrice(false);
    }
  }

  async function deleteProduct() {
    if (!pendingDelete) return false;
    const item = pendingDelete;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/products/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete product.");
      await load();
      if (editingId === item.id) {
        setEditingId(null);
        setProduct(initialProduct);
      }
      setNotice("Product deleted.");
      return true;
    } catch (deleteError) {
      console.error("Could not delete brewery product", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete product.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function editProduct(item: Product & Record<string, unknown>) {
    setEditingId(item.id);
    setProductKind(null);
    setProduct(productForm(item));
    setCurrentImageUrl(typeof item.image_url === "string" ? item.image_url : "");
    setSelectedImage(null);
    setRemoveImage(false);
    setImageInputKey((key) => key + 1);
    setError("");
    setNotice("");
    setPriceSuggestionMessage("");
    setProductModalOpen(true);
  }

  function openAddProduct() {
    setEditingId(null);
    const isHomebrewShop = account?.business_type === "homebrew_shop";
    setProduct(initialProduct);
    setProductKind(isHomebrewShop ? "kit" : null);
    setCurrentImageUrl("");
    setSelectedImage(null);
    setRemoveImage(false);
    setImageInputKey((key) => key + 1);
    setError("");
    setNotice("");
    setPriceSuggestionMessage("");
    setProductModalOpen(true);
  }

  function closeProductModal() {
    if (saving) return;
    setProductModalOpen(false);
    setEditingId(null);
    setProduct(initialProduct);
    setProductKind(null);
    setCurrentImageUrl("");
    setPriceSuggestionMessage("");
    setSelectedImage(null);
    setRemoveImage(false);
    setImageInputKey((key) => key + 1);
  }

  const downloadQrCode = async (productName: string) => {
    const svg = qrCodeRef.current?.querySelector("svg");
    if (!svg) {
      setError("The QR code is not ready to download.");
      return;
    }

    const safeProductName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "product";
    setDownloadingQr(true);
    setError("");
    try {
      const downloadSvg = svg.cloneNode(true) as SVGSVGElement;
      downloadSvg.setAttribute("width", "2048");
      downloadSvg.setAttribute("height", "2048");
      const svgMarkup = new XMLSerializer().serializeToString(downloadSvg);
      await saveDownload(
        new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
        `${safeProductName}-qr.svg`
      );
    } catch (downloadError) {
      console.error("Could not download product QR code", downloadError);
      setError(getErrorMessage(downloadError, "Could not download the QR code."));
    } finally {
      setDownloadingQr(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((item) => {
    if (!normalizedSearch) return true;
    const category = categories.find(([value]) => value === item.category)?.[1] ?? item.category;
    return [
      item.name,
      category,
      item.style,
      item.description,
    ].some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(normalizedSearch));
  });

  return (
    <main className="min-h-screen px-2 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-3 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute left-4 top-3 z-40"><BackButton href="/business/manage" /></div>
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
        <PageHeading title="Product catalogue" subtitle={account?.name ?? "Manage your business products"} />
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg border border-green-400/30 bg-green-950/40 p-3 text-green-200">{notice}</p>}

        {loading ? <p className="text-center text-white/65">Loading your catalogue…</p> : needsLogin ? (
          <p className="text-center text-white/75">
            <Link href="/auth/login" className="text-green-200 underline">Log in</Link>
            {" to manage your business catalogue."}
          </p>
        ) : loadFailed ? (
          <div className="text-center text-white/75">
            <p>Your product catalogue could not be verified right now.</p>
            <button type="button" onClick={() => {
              setLoading(true);
              setError("");
              load().catch((loadError) => {
                console.error("Could not reload brewery product catalogue", loadError);
                setLoadFailed(true);
                setError(loadError instanceof Error ? loadError.message : "Could not load your product catalogue.");
              }).finally(() => setLoading(false));
            }} className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">Try again</button>
          </div>
        ) : !account ? (
          <p className="text-center text-white/75">No business account is associated with your account. <Link href="/business/manage" className="text-green-200 underline">Business account</Link></p>
        ) : !account.hasAccess ? (
          <p className="text-center text-white/75">An approved business account with active access is required to manage products. <Link href="/business/manage" className="text-green-200 underline">Go to your business account</Link></p>
        ) : !account.isOwner && account.role !== "manager" && account.role !== "editor" ? (
          <p className="text-center text-white/75">Your role cannot manage products. <Link href="/business/manage" className="text-green-200 underline">Go to your business account</Link></p>
        ) : (
          <div className="space-y-5">
            {products.length > 0 && (
              <div className="flex justify-center">
                <button type="button" onClick={openAddProduct} className="rounded-lg border border-green-500 bg-green-700 px-6 py-3 font-semibold hover:bg-green-600">
                  Add new product
                </button>
              </div>
            )}

            {products.length === 0 ? (
              <section className="mx-auto max-w-2xl rounded-xl border border-green-400/20 bg-green-950/20 p-5">
                <h2 className="text-lg font-semibold text-green-100">Start your catalogue</h2>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  {account.business_type === "homebrew_shop"
                    ? "List all-grain, fresh wort, and malt extract beer kits on your business page."
                    : "Add a brewing kit, beverage, or other product. You can include product details and an optional picture, then publish the listing on your business page."}
                </p>
                <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <li className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="block font-semibold text-white/90">1. Choose a listing</span>
                    <span className="mt-1 block text-white/60">
                      {account.business_type === "homebrew_shop"
                        ? "Choose a beer kit type."
                        : "Select a brewing kit or beverage."}
                    </span>
                  </li>
                  <li className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="block font-semibold text-white/90">2. Add details</span>
                    <span className="mt-1 block text-white/60">Describe it and add brewing or product information.</span>
                  </li>
                  <li className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="block font-semibold text-white/90">3. Publish and share</span>
                    <span className="mt-1 block text-white/60">Make it public, then share its page or owner QR code.</span>
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="mt-4 rounded-lg border border-green-500 bg-green-700 px-5 py-2.5 font-semibold hover:bg-green-600"
                >
                  Add your first product
                </button>
              </section>
            ) : (
              <>
                <label className="mx-auto block max-w-xl text-sm text-white/70">
                  Search products
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by product, category, or style"
                    className={inputClass}
                  />
                </label>
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-sm text-white/60">No products match “{searchQuery.trim()}”.</p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((item) => {
                  const publicUrl = `${publicAppOrigin}/business/${account.slug}/${item.slug}?source=qr`;
                  return (
                    <li key={item.id} className={`relative flex min-w-0 flex-col rounded-xl border border-white/10 bg-white/5 ${qrProductId === item.id ? "z-20" : ""}`}>
                      {typeof item.image_url === "string" && item.image_url && (
                        <img src={item.image_url} alt="" className="h-40 w-full rounded-t-xl bg-black/20 object-contain" />
                      )}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="min-w-0">
                          <ProductCardTitle name={item.name} />
                          <p className="mt-1 text-xs text-green-200/75">{categories.find(([value]) => value === item.category)?.[1] ?? item.category}</p>
                          {item.price != null && typeof item.price_currency === "string" && (
                            <p className="mt-1 text-sm font-semibold text-green-100">
                              {item.price_currency} {Number(item.price).toFixed(2)} · listed price
                            </p>
                          )}
                          <p className="mt-2 text-xs text-white/50">{item.is_published ? "Published" : "Unpublished"} · {item.analytics.pageViews} page views · {item.analytics.qrScans} QR scans (30 days)</p>
                          {item.is_published && <Link href={`/business/${account.slug}/${item.slug}`} className="mt-2 inline-block text-sm text-green-200 underline">Open public product page</Link>}
                        </div>
                        <div className="mt-auto flex flex-wrap gap-2 pt-4">
                          <button type="button" aria-expanded={qrProductId === item.id} onClick={() => setQrProductId(qrProductId === item.id ? null : item.id)} className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-sm">QR</button>
                          <button type="button" onClick={() => editProduct(item)} className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-sm">Edit</button>
                          <button type="button" disabled={busy} onClick={() => setPendingDelete(item)} className="rounded border border-red-400/30 bg-red-950/30 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50">Delete</button>
                        </div>
                      </div>
                      {qrProductId === item.id && item.is_published && (
                        <div className="brewery-product-qr absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/95 p-3 text-center text-white shadow-xl backdrop-blur-sm">
                          <button
                            type="button"
                            aria-label="Close product QR code"
                            onClick={() => setQrProductId(null)}
                            className="absolute right-2 top-2 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
                          >
                            Close
                          </button>
                          <div ref={qrCodeRef} className="shrink-0 rounded bg-white p-2">
                            <QRCodeSVG value={publicUrl} size={144} level="M" includeMargin bgColor="#FFFFFF" />
                          </div>
                          <div className="max-w-sm pt-1">
                            <p className="font-semibold">Product QR code</p>
                            <p className="mt-1 text-sm text-white/70">Scan this code to open the public product page.</p>
                            <button type="button" disabled={downloadingQr} onClick={() => void downloadQrCode(item.name)} className="mt-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                              {downloadingQr ? "Preparing download…" : "Download QR code"}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                  </ul>
                )}
              </>
            )}

            {productModalOpen && typeof document !== "undefined" && createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeProductModal();
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="product-modal-title"
                  className="relative my-auto max-h-[calc(100dvh-3rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-7"
                >
                  <button
                    type="button"
                    aria-label="Close product form"
                    disabled={saving}
                    onClick={closeProductModal}
                    className="absolute right-4 top-4 rounded p-1 text-xl text-white/60 hover:text-white disabled:opacity-50"
                  >
                    ×
                  </button>
                  {productKind === null && !editingId && account.business_type !== "homebrew_shop" ? (
                    <>
                      <h2 id="product-modal-title" className="pr-8 text-xl font-semibold text-green-200">What are you adding?</h2>
                      <p className="mt-1 text-sm text-white/60">Choose the type of listing you want to create.</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProduct({ ...initialProduct, category: "all-grain-kit" });
                            setProductKind("kit");
                          }}
                          className="rounded-xl border border-white/15 bg-white/5 p-5 text-left transition hover:border-green-400/50 hover:bg-white/10"
                        >
                          <span className="block font-semibold text-green-100">Brewing kit</span>
                          <span className="mt-1 block text-sm text-white/60">Create a kit listing with batch size, target ABV, color, and bitterness details.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProduct({ ...initialProduct, category: "beer" });
                            setProductKind("beverage");
                          }}
                          className="rounded-xl border border-white/15 bg-white/5 p-5 text-left transition hover:border-green-400/50 hover:bg-white/10"
                        >
                          <span className="block font-semibold text-green-100">Beverage</span>
                          <span className="mt-1 block text-sm text-white/60">List drinks you serve or sell, such as beer, cider, wine, spirits, or non-alcoholic drinks.</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                  <h2 id="product-modal-title" className="pr-8 text-xl font-semibold text-green-200">{editingId ? "Edit product" : productKind === "beverage" ? "Add beverage" : "Add brewing kit"}</h2>
                  <p className="mt-1 text-sm text-white/60">{editingId ? "Update this product listing. Customers can rate and review published listings." : productKind === "beverage" ? "Create a listing for a beverage your bar or business serves or sells. Customers can rate and review published listings." : "Create a listing for your brewing kit. Customers can rate and review published listings."}</p>
                  <form onSubmit={saveProduct} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Product name<input required maxLength={160} className={inputClass} value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} /></label>
              <label className="block text-sm">Category<select className={inputClass} value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })}>{(account.business_type === "homebrew_shop" ? beerKitCategories : productKind === "beverage" && !editingId ? beverageCategories : categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm">Style / type<input maxLength={120} className={inputClass} value={product.style} onChange={(event) => setProduct({ ...product, style: event.target.value })} /></label>
              <label className="block text-sm">
                Price <span className="text-white/50">(optional)</span>
                <input
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  inputMode="decimal"
                  className={inputClass}
                  value={product.price}
                  disabled={suggestingPrice}
                  onChange={(event) => setProduct({ ...product, price: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                Currency <span className="text-white/50">(required with a price)</span>
                <input
                  type="text"
                  maxLength={3}
                  autoCapitalize="characters"
                  placeholder="NOK"
                  className={inputClass}
                  value={product.priceCurrency}
                  disabled={suggestingPrice}
                  onChange={(event) => setProduct({ ...product, priceCurrency: event.target.value.toUpperCase() })}
                />
                <span className="mt-1 block text-xs text-white/50">Use a 3-letter currency code, such as NOK or EUR.</span>
              </label>
              {beverageCategories.some(([value]) => value === product.category) && (
                <label className="block text-sm">
                  Brewed by <span className="text-white/50">(optional)</span>
                  <input maxLength={160} className={inputClass} value={product.brewedBy} onChange={(event) => setProduct({ ...product, brewedBy: event.target.value })} />
                </label>
              )}
              {beerKitCategories.some(([value]) => value === product.category) && (
                <>
                  <label className="block text-sm">Batch size (litres)<input type="number" min="0" max="10000" step="0.1" className={inputClass} value={product.batchSizeLiters} onChange={(event) => setProduct({ ...product, batchSizeLiters: event.target.value })} /></label>
                  <label className="block text-sm">Target ABV (%)<input type="number" min="0" max="100" step="0.1" className={inputClass} value={product.abv} onChange={(event) => setProduct({ ...product, abv: event.target.value })} /></label>
                  <label className="block text-sm">Color (EBC)<input type="number" min="0" max="1000" step="1" className={inputClass} value={product.ebc} onChange={(event) => setProduct({ ...product, ebc: event.target.value })} /></label>
                  <label className="block text-sm">Bitterness (IBU)<input type="number" min="0" max="1000" step="1" className={inputClass} value={product.ibu} onChange={(event) => setProduct({ ...product, ibu: event.target.value })} /></label>
                </>
              )}
              {!beerKitCategories.some(([value]) => value === product.category) && (
                <>
                  <label className="block text-sm">ABV (%)<input type="number" min="0" max="100" step="0.01" className={inputClass} value={product.abv} onChange={(event) => setProduct({ ...product, abv: event.target.value })} /></label>
                  {!beverageCategories.some(([value]) => value === product.category) && (
                    <label className="block text-sm">Package size<input maxLength={120} placeholder="e.g. 330 ml can" className={inputClass} value={product.packageSize} onChange={(event) => setProduct({ ...product, packageSize: event.target.value })} /></label>
                  )}
                </>
              )}
              <div className="text-sm sm:col-span-2">
                <label htmlFor="product-url">Product URL (optional)</label>
                <input
                  id="product-url"
                  type="text"
                  inputMode="url"
                  placeholder="https://shop.example.com/products/your-product"
                  className={inputClass}
                  value={product.productUrl}
                  disabled={suggestingPrice}
                  onChange={(event) => {
                    setProduct({ ...product, productUrl: event.target.value });
                    setPriceSuggestionMessage("");
                  }}
                />
                <span className="mt-1 block text-xs text-white/50">Customers can visit this page. Product pictures are added separately by uploading an image below.</span>
                <button
                  type="button"
                  onClick={() => void suggestPriceFromLink()}
                  disabled={!product.productUrl.trim() || suggestingPrice}
                  className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestingPrice ? "Checking product page…" : "Suggest price from link"}
                </button>
                <span className="ml-3 text-xs text-white/50">
                  Suggestions only work when the page provides public price metadata. Verify before saving.
                </span>
                {priceSuggestionMessage && (
                  <p role="status" className="mt-2 text-xs text-white/70">{priceSuggestionMessage}</p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm">
                  Product picture (optional)
                  <span className="mt-1 block text-xs text-white/50">
                    Near-white backgrounds touching the image edges are removed automatically.
                  </span>
                  <input
                    key={imageInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white`}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        setError("Product images must be 5 MB or smaller.");
                        event.target.value = "";
                        return;
                      }
                      if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                        setError("Choose a JPEG, PNG, or WebP image.");
                        event.target.value = "";
                        return;
                      }
                      setError("");
                      setSelectedImage(file);
                      setRemoveImage(false);
                    }}
                  />
                  <span className="mt-1 block text-xs text-white/50">JPEG, PNG, or WebP, up to 5 MB. Product links are never used to fetch pictures.</span>
                </label>
                {(selectedImagePreview || (!removeImage && currentImageUrl)) && (
                  <div className="flex flex-wrap items-center gap-3">
                    <img
                      src={selectedImagePreview || currentImageUrl}
                      alt="Product picture preview"
                      className="h-24 w-32 rounded-lg border border-white/10 bg-black/20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setCurrentImageUrl("");
                        setRemoveImage(true);
                        setImageInputKey((key) => key + 1);
                      }}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                    >
                      Remove picture
                    </button>
                  </div>
                )}
                {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
              </div>
              <label className="block text-sm sm:col-span-2">Description<textarea rows={3} maxLength={5000} className={inputClass} value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={product.isPublished} onChange={(event) => setProduct({ ...product, isPublished: event.target.checked })} />Publish this product publicly</label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button disabled={saving || suggestingPrice} className="rounded-lg border border-green-400/30 bg-green-700 px-4 py-2 font-semibold disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save product" : "Add product"}</button>
                <button type="button" disabled={saving} onClick={closeProductModal} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 disabled:opacity-50">Cancel</button>
              </div>
            </form>
                    </>
                  )}
                </section>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product?"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? This also removes its reviews. This action cannot be undone.` : ""}
        confirmLabel="Delete product"
        onConfirm={deleteProduct}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
