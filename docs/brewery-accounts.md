# Business accounts setup

Business pages support breweries, pubs or bars, homebrew shops, and
other custom business types. They use the existing Stripe webhook and
Supabase service-role client.
Apply the SQL manually in the Supabase SQL editor:

1. Run `supabase/sql/brewery_accounts.sql`.
   Re-run this script after updating the app to add the all-grain-kit category
   and its optional specification columns, or the product URL field, to an
   existing installation.
2. For existing installations, apply new SQL files in `supabase/migrations/`
   before deploying features that depend on them. The shop-click analytics
   migration adds `outbound_click` as a supported product analytics event.
3. Confirm the `brewery_accounts`, `brewery_members`, `brewery_products`,
   `brewery_product_reviews`, `brewery_review_reports`, and
   `brewery_product_analytics` tables were created.
4. Configure `STRIPE_BREWERY_MONTHLY_PRICE_ID` and
   `STRIPE_BREWERY_YEARLY_PRICE_ID` with the monthly and annual recurring Stripe
   Price IDs for the Business product. The app offers both plan choices on the
   approved Business account page.
5. Keep the existing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
   `NEXT_PUBLIC_APP_URL` configuration in place.
6. Configure the existing `/api/billing/webhook` Stripe endpoint to send
   `checkout.session.completed` and `customer.subscription.created`,
   `customer.subscription.updated`, and `customer.subscription.deleted`.

Owners apply from `/business/manage`, selecting a business type. Choosing
"Other" allows a custom type label. Applications must be approved by an
administrator before checkout. Administrators can approve applications and
grant complimentary access from `/admin/breweries`. They can also create a
business page with complimentary access from **Admin → Users → Edit user**.
Applications collect a contact name, business email, a short description of
what the business makes or sells, and (optionally) how the applicant heard
about Batchlogg. Application contact details are not shown publicly.
Manual grants have optional expiry and notes and remain separate from Stripe
subscription status. Only an approved account
with an active subscription or current manual grant is publicly visible.

Business owners can manage teammates from `/business/manage`. They can add
existing Batchlogg users by username or email, or invite a new user by email.
New-user invitations use Supabase Auth email delivery; allow
`NEXT_PUBLIC_APP_URL/business/manage` in Supabase Auth's redirect URL settings.
Managers can edit business details, manage products, and view analytics.
Editors can manage products and view analytics. The business owner can manage
billing and the team, including changing teammate roles. To migrate an existing
installation and combine previous Analyst memberships with Editors, run
`supabase/sql/brewery_team_roles.sql` in the Supabase SQL editor. A user can
belong to several business teams and choose the active business from the
account page. Removing a teammate immediately revokes that business's access.
Owners can permanently delete their business account from `/business/manage`.
They must type `DELETE` to confirm and cancel any Stripe subscription first.
Deletion removes the business, team memberships, products, product images,
analytics, and product reviews/reports; it does not delete the owner's Batchlogg
user account.

**Beer & Brewing Reviews** helps people discover and review kits, beverages,
breweries, pubs, homebrew shops, and other business products. The catalogue supports
beverages as well as brewing equipment, brewing ingredients, merchandise, and
other products, including all-grain beer kits with batch size, style, target
ABV, EBC, and IBU. Customers can rate and review each product;
the business page shows each product's average rating and review count.
Owners can upload a JPEG, PNG, or WebP product picture (up to 5 MB). Product
pictures are only set through uploads; the app never fetches images from product
links. Product management is available from the private `/business/manage/catalogue`
page, linked from the Business account page only when access is active; it is
not listed in the site menu. Product QR codes are rendered only in this
authenticated owner page. They link to the public product page with an
analytics source marker. Business analytics are available from the Business
account page and summarize product page visits, QR scans, clicks through to
product URLs, published products, ratings, recent reviews, and popular products
over selectable 7-, 30-, or 90-day periods. Shop click rate is outbound clicks
divided by product page visits; events are not deduplicated by visitor. Product
URLs link customers to the business's own product page.
Product URLs, website URLs, and logo links must use HTTPS. Uploaded product
pictures are stored in the public
`business-product-images` Supabase Storage bucket, created when first needed.
Reviews are community-submitted and do not depend on paid or complimentary
business access.

Website and logo URL fields accept bare domains (for example, `homebrew.no`)
and automatically store them as HTTPS URLs.
