import { NextResponse } from "next/server";
import { getBreweryContext } from "@/lib/brewery/access";
import { getOwnedProductImagePath, PRODUCT_IMAGE_BUCKET } from "@/lib/brewery/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const { user, account, isOwner, serviceRole } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can delete this business account." }, { status: 403 });

    if (
      account.stripe_subscription_id &&
      !["canceled", "incomplete_expired"].includes(account.stripe_subscription_status ?? "")
    ) {
      return NextResponse.json({
        error: "Cancel the business subscription in Stripe first. Once Stripe confirms the subscription is canceled, you can delete the account.",
        billingCancellationRequired: true,
      }, { status: 409 });
    }

    const { data: products, error: productsError } = await serviceRole
      .from("brewery_products")
      .select("image_url")
      .eq("brewery_id", account.id);
    if (productsError) throw productsError;

    const imagePaths = [...new Set(
      (products ?? [])
        .map((product) => getOwnedProductImagePath(product.image_url, account.id))
        .filter((path): path is string => path !== null)
    )];

    const { data: deletedAccount, error: deleteError } = await serviceRole
      .from("brewery_accounts")
      .delete()
      .eq("id", account.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deletedAccount) {
      return NextResponse.json({ error: "Business account not found or no longer owned by you." }, { status: 404 });
    }

    let cleanupWarning: string | null = null;
    for (let index = 0; index < imagePaths.length; index += 100) {
      const { error } = await serviceRole.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(imagePaths.slice(index, index + 100));
      if (error) {
        console.error("Business account was deleted, but product images could not all be removed", error);
        cleanupWarning = "The account and its database data were deleted, but some uploaded product images could not be removed. Contact support to finish storage cleanup.";
        break;
      }
    }

    const response = NextResponse.json({ success: true, cleanupWarning });
    response.cookies.delete("active_brewery_id");
    return response;
  } catch (error) {
    console.error("Could not delete business account", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not delete the business account." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
