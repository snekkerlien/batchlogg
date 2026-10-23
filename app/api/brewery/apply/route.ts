import { NextRequest, NextResponse } from "next/server";
import { getBreweryContext, normalizeOptionalUrl, slugifyBreweryValue } from "@/lib/brewery/access";
import { isBusinessType } from "@/lib/brewery/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const websiteUrl = normalizeOptionalUrl(body.websiteUrl);
  const businessType = body.businessType;
  const businessTypeOther =
    typeof body.businessTypeOther === "string" ? body.businessTypeOther.trim() : "";
  const contactName =
    typeof body.contactName === "string" ? body.contactName.trim() : "";
  const businessEmail =
    typeof body.businessEmail === "string" ? body.businessEmail.trim().toLowerCase() : "";
  const offerings =
    typeof body.offerings === "string" ? body.offerings.trim() : "";
  const referralSource =
    typeof body.referralSource === "string" ? body.referralSource.trim() : "";
  if (
    name.length < 2 ||
    name.length > 120 ||
    description.length > 5000 ||
    location.length > 200 ||
    websiteUrl === undefined ||
    !isBusinessType(businessType) ||
    (businessType === "other" && (businessTypeOther.length < 2 || businessTypeOther.length > 100)) ||
    contactName.length < 2 ||
    contactName.length > 120 ||
    businessEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail) ||
    offerings.length < 10 ||
    offerings.length > 2000 ||
    referralSource.length > 500
  ) {
    return NextResponse.json({ error: "Check your business details and try again." }, { status: 400 });
  }

  const slug = slugifyBreweryValue(name);
  if (!slug) {
    return NextResponse.json({ error: "Enter a business name that can be used in a public link." }, { status: 400 });
  }

  try {
    const { user, serviceRole } = await getBreweryContext();
    const { data: ownedAccount, error: ownerLookupError } = await serviceRole
      .from("brewery_accounts")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownerLookupError) throw ownerLookupError;
    if (ownedAccount) {
      return NextResponse.json({ error: "You already have a business application or account." }, { status: 409 });
    }

    const { data, error } = await serviceRole
      .from("brewery_accounts")
      .insert({
        owner_id: user.id,
        name,
        business_type: businessType,
        business_type_other: businessType === "other" ? businessTypeOther : null,
        application_contact_name: contactName,
        application_business_email: businessEmail,
        application_offerings: offerings,
        application_referral_source: referralSource || null,
        slug,
        description,
        location,
        website_url: websiteUrl,
        status: "pending",
      })
      .select("id, name, slug, status")
      .single();
    if (error?.code === "23505") {
      return NextResponse.json({ error: "A business with that public name is already registered." }, { status: 409 });
    }
    if (error) throw error;

    const response = NextResponse.json({ account: data }, { status: 201 });
    response.cookies.set("active_brewery_id", data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("Could not submit business application", error);
    return NextResponse.json(
      { error: error instanceof Error && error.message === "Authentication required" ? error.message : "Could not submit business application." },
      { status: error instanceof Error && error.message === "Authentication required" ? 401 : 500 }
    );
  }
}
