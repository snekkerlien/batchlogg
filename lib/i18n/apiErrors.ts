export const LEARNING_PROGRESS_ERROR_KEYS: Record<string, string> = {
  "Authentication required": "Authentication required",
  "Invalid request body": "Invalid request body",
  "Invalid attempt data": "Invalid attempt data",
  "Could not load learning progress": "Could not load learning progress.",
  "Could not save learning progress": "Could not save learning progress.",
  "Could not save learning progress.": "Could not save learning progress.",
  "Could not reset learning progress": "Could not reset learning progress.",
  "Could not load saved learning progress.": "Could not load learning progress.",
};

export const INVENTORY_HISTORY_ERROR_KEYS: Record<string, string> = {
  "Authentication required": "Authentication required",
  "Apply the inventory movement ledger migration to enable stock history.": "Apply the inventory movement ledger migration to enable stock history.",
  "Could not load inventory movement history": "Could not load stock history.",
  "Could not load stock history.": "Could not load stock history.",
};

export const BREWING_PROFILE_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Apply the water chemistry profiles migration to save profiles.",
  "Apply the equipment profiles database migration to save equipment settings.",
  "Could not load water chemistry profiles",
  "Could not load water profiles.",
  "Could not save water chemistry profile",
  "Could not save water chemistry profile.",
  "Could not save water profile.",
  "Could not update water chemistry profile",
  "Could not update water chemistry profile.",
  "Could not delete water chemistry profile",
  "Could not delete water profile.",
  "Enter a name and valid ion values.",
  "Enter a profile name and all six valid source and target ion values before saving.",
  "Invalid JSON body",
  "Invalid water profile ID",
  "Water chemistry profile not found",
  "Water profile ID is required",
  "A water profile with this name already exists.",
  "You can save up to 20 water chemistry profiles.",
  "Could not load equipment profiles",
  "Could not load equipment profiles.",
  "Could not save equipment profile",
  "Could not save equipment profile.",
  "Could not update equipment profile.",
  "Could not delete equipment profile",
  "Could not delete equipment profile.",
  "Enter valid equipment settings.",
  "Enter a profile name and valid equipment settings before saving.",
  "Invalid equipment profile ID",
  "Equipment profile not found",
  "Equipment profile ID is required",
  "A profile with this name already exists.",
  "You can save up to 20 equipment profiles.",
].map((key) => [key, key]));

export function translateBrewingProfileError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, BREWING_PROFILE_ERROR_KEYS);
}

export const SHOPPING_LIST_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "This feature requires Premium.",
  "Could not verify Premium access",
  "Could not load shopping list",
  "Invalid JSON body",
  "Add between 1 and 100 shopping-list items",
  "One or more shopping-list items are invalid",
  "Could not verify recipe ownership",
  "One or more recipes are unavailable",
  "Could not add shopping-list items",
  "Combined shopping-list quantity cannot exceed 1,000,000",
  "A valid shopping-list item ID is required",
  "Enter an item name up to 200 characters",
  "Enter a valid item amount",
  "Item units must be 32 characters or fewer",
  "No item changes provided",
  "Could not update shopping-list item",
  "Shopping-list item not found",
  "Could not clear shopping list",
  "Could not remove shopping-list item",
].map((key) => [key, key]));

export function translateApiError(
  message: string,
  t: (key: string) => string,
  errorKeys: Record<string, string>
) {
  const key = Object.hasOwn(errorKeys, message)
    ? errorKeys[message]
    : undefined;
  return key ? t(key) : message;
}

export const BILLING_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Premium checkout is not configured yet",
  "Profile not found",
  "Premium is already active",
  "Could not start Premium checkout",
  "Could not load billing profile",
  "This account does not have a Stripe subscription to manage",
  "Could not open billing management",
  "This account does not have a Stripe subscription to cancel",
  "Could not verify the subscription for this account",
  "There is no active subscription to cancel",
  "Could not open the cancellation page",
].map((key) => [key, key]));

export function translateBillingError(message: string, t: (key: string) => string) {
  return translateApiError(message, t, BILLING_ERROR_KEYS);
}

export const BUSINESS_MANAGEMENT_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "A business with that public name is already registered.",
  "An active business account is required to edit this page.",
  "An active business account is required to manage the team.",
  "Authentication required",
  "Brewery account not found.",
  "Business account not found or no longer owned by you.",
  "Business account not found.",
  "Business billing is not configured yet.",
  "Cancel the business subscription in Stripe first. Once Stripe confirms the subscription is canceled, you can delete the account.",
  "Check your business details and try again.",
  "Choose Manager or Editor.",
  "Choose a monthly or annual billing plan.",
  "Choose a valid business account.",
  "Choose a valid team role.",
  "Could not delete the business account.",
  "Could not load brewery management data.",
  "Could not load the business team.",
  "Could not open brewery billing management.",
  "Could not remove the team member.",
  "Could not start brewery checkout.",
  "Could not submit business application.",
  "Could not switch business accounts.",
  "Could not update business page.",
  "Could not update the team member role.",
  "Enter a business name that can be used in a public link.",
  "Enter a username or email address.",
  "Enter a valid Batchlogg username or email address.",
  "Invalid request body",
  "Invalid team member.",
  "No Batchlogg account was found for that username.",
  "Only business owners and managers can edit page details.",
  "Only the business owner can delete this business account.",
  "Only the business owner can manage billing.",
  "Only the business owner can manage the team.",
  "Submit a business application first.",
  "Team member not found.",
  "That email already has a Batchlogg account. Add them by username instead.",
  "That person is already on this business team.",
  "The invite email was sent, but the team membership could not be created. Please try again or contact support.",
  "This brewery already has an active subscription.",
  "This brewery does not have a Stripe subscription to manage.",
  "You already have a business application or account.",
  "You are already the owner of this business.",
  "You do not have access to that business account.",
  "Your business application must be approved before checkout.",
  "Could not load business account.",
  "Could not save changes.",
  "Could not submit application.",
  "Could not save your page.",
  "Could not switch business accounts.",
  "Could not open billing.",
  "Could not add the team member.",
  "Could not remove the team member.",
  "Could not update the team member role.",
  "The account was deleted, but this page could not refresh. Reload the page to continue.",
].map((key) => [key, key]));

export function translateBusinessManagementError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, BUSINESS_MANAGEMENT_ERROR_KEYS);
}

export const BREWERY_ANALYTICS_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Business account not found.",
  "An active business account is required.",
  "Only owners, managers, and editors can view analytics.",
  "Choose a valid analytics period.",
  "Could not load business analytics.",
].map((key) => [key, key]));

export function translateBreweryAnalyticsError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, BREWERY_ANALYTICS_ERROR_KEYS);
}

export const BREWERY_PRODUCT_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "A product with that name or URL already exists for your brewery.",
  "A product with that URL already exists.",
  "An active business account is required.",
  "Authentication required",
  "Brewery account not found.",
  "Check the product details and try again.",
  "Choose a JPEG, PNG, or WebP image.",
  "Could not add product.",
  "Could not delete product.",
  "Could not suggest a price from that product page.",
  "Could not process this image. Try another JPEG, PNG, or WebP file.",
  "Could not report review.",
  "Could not remove your review.",
  "Could not remove your vote.",
  "Could not save your review.",
  "Could not save your vote.",
  "Could not update product.",
  "Could not verify business access.",
  "Could not verify review.",
  "Could not load product reviews.",
  "Enter a valid product page URL.",
  "Homebrew shops can only list beer kits.",
  "Invalid product details.",
  "Invalid product form data.",
  "Invalid product ID.",
  "Invalid product image.",
  "Invalid request body.",
  "Invalid request origin.",
  "Invalid review ID.",
  "Log in to remove your review.",
  "Log in to report a review.",
  "Log in to review this product.",
  "Log in to vote on a review.",
  "No supported public price metadata was found on that page.",
  "Only owners, managers, and editors can manage products.",
  "Only public HTTPS product links can be checked.",
  "Product image must be 5 MB or smaller.",
  "Product images must be 5 MB or smaller.",
  "Product image storage is unavailable.",
  "Product page host is not publicly reachable.",
  "Product page is too large to inspect.",
  "Product page redirected too many times.",
  "Product page request timed out.",
  "Product page URL is too long.",
  "Product not found.",
  "Provide a rating from 1 to 5 and a review of up to 3,000 characters.",
  "Provide a short reason for the report.",
  "Review not found.",
  "The product page could not be read.",
  "The product page did not return a valid price suggestion.",
  "The selected file is not a valid image.",
  "This review was hidden by moderation. Contact support if you want it reviewed.",
  "Unsupported product image format.",
  "Unexpected product page host.",
  "Your helpful vote was not found.",
  "Your review was not found.",
  "You cannot vote on your own review.",
].map((key) => [key, key]));

export function translateBreweryProductError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, BREWERY_PRODUCT_ERROR_KEYS);
}

export const COMMUNITY_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "A community recipe post must include exactly one recipe.",
  "A friend request is already pending",
  "A request is already pending",
  "A valid discussion is required",
  "Accept or decline the incoming request",
  "Apply the community recipe database migration before posting community recipes.",
  "Authentication required",
  "Choose one of your publicly shared recipes for the community post.",
  "Content visibility changed, but the audit log could not be updated.",
  "Could not accept friend request",
  "Could not cancel friend request",
  "Could not check forum posting permission",
  "Could not clean up uploaded images",
  "Could not create discussion",
  "Could not create reply",
  "Could not delete forum content",
  "Could not load conversation",
  "Could not load forum attachments",
  "Could not load forum author names",
  "Could not load forum bookmarks",
  "Could not load forum likes",
  "Could not load forum replies",
  "Could not load forum restrictions",
  "Could not load forum topics",
  "Could not load friends",
  "Could not load inbox",
  "Could not remove forum content",
  "Could not remove saved discussion",
  "Could not respond to request",
  "Could not save discussion",
  "Could not save privacy setting",
  "Could not send friend request",
  "Could not send message",
  "Could not submit report",
  "Could not unblock this user",
  "Could not update conversation",
  "Could not update forum content",
  "Could not update forum content visibility",
  "Could not update friend request",
  "Could not update like",
  "Could not upload images",
  "Could not validate friend request",
  "Could not verify forum posting permissions",
  "Could not verify recipient",
  "Could not verify reported message",
  "Could not verify tagged items.",
  "Could not verify the selected recipe.",
  "Could not verify your profile visibility.",
  "Discussion not found",
  "Each image must be smaller than 5 MB",
  "Enter a message up to 2000 characters and choose a valid friend",
  "Forbidden",
  "Forum content not found",
  "Forum content was removed, but the audit log could not be updated.",
  "Forum posting is temporarily restricted.",
  "Friend request not found",
  "Friend requests are unavailable for this user",
  "Images must be JPEG, PNG, or WebP files",
  "Invalid JSON body",
  "Invalid community recipe setting.",
  "Invalid conversation",
  "Invalid discussion ID",
  "Invalid discussion details",
  "Invalid forum content",
  "Invalid forum content identifier",
  "Invalid forum moderation details",
  "Invalid forum page",
  "Invalid friend request",
  "Invalid image cleanup request",
  "Invalid image upload",
  "Invalid like request",
  "Invalid message cursor",
  "Invalid privacy setting",
  "Invalid reply details",
  "Invalid request response",
  "Invalid user",
  "Only your own currently public recipes and batches can be tagged.",
  "Report details must be 10-2000 characters",
  "Reported message not found",
  "Request canceled but notification did not update",
  "Request sent but notification failed",
  "The selected file is not a valid JPEG, PNG, or WebP image",
  "This conversation is unavailable",
  "This user is not accepting friend requests",
  "Unknown action",
  "You are already friends",
  "You can only message friends who have not blocked you",
  "Your profile must be public to post a community recipe.",
  "You’re sending messages too quickly. Try again shortly.",
  "You’ve sent too many friend requests. Try again later.",
  "Message sent, but its notification could not be created.",
  "A list of notification IDs is required",
  "All profile showcase fields are required",
  "Authentication required.",
  "Choose one of your public recipes to feature",
  "Could not clear achievement notifications",
  "Could not clear community notifications",
  "Could not clear forum notifications",
  "Could not load achievement notifications",
  "Could not load achievement rankings",
  "Could not load community notifications",
  "Could not load notifications",
  "Could not load profile",
  "Could not load profile admin details",
  "Could not load profile statistics",
  "Could not load public batches.",
  "Could not load public recipes.",
  "Could not save profile showcase",
  "Could not store report evidence",
  "Could not synchronize achievement notifications",
  "Could not update achievement notifications",
  "Could not update notifications",
  "Could not verify profile access",
  "Could not verify profile showcase access",
  "Could not verify reported content",
  "Could not verify reported profile",
  "Evidence must be valid JPEG, PNG, or WebP images smaller than 5 MB",
  "Invalid mention search.",
  "Invalid notification type",
  "Invalid profile showcase settings",
  "Invalid report details",
  "Invalid report request",
  "Invalid request body",
  "Profile is private",
  "Profile not found",
  "Profile recipe featuring is a Premium feature.",
  "Report evidence exceeds the upload limit",
  "Reported batch not found",
  "Reported content not found",
  "Reported profile not found",
  "Reported recipe not found",
  "Valid username is required",
  "You can only preview your own profile",
  "You cannot report your own content",
].map((key) => [key, key]));

export function translateCommunityError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, COMMUNITY_ERROR_KEYS);
}

export const ACCOUNT_BACKUP_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "A batch note image is not owned by its batch",
  "Authentication required",
  "A {item} file has an invalid URL",
  "A {item} file has an invalid storage path",
  "A {item} file has an unsafe storage path",
  "{item} contains invalid records",
  "{item} is too large",
  "{item} is not valid JSON",
  "Backup batch image does not match an exported batch",
  "Backup contains a batch image linked to the wrong batch",
  "Backup contains an invalid {item} URL",
  "Backup contains an invalid {item} storage path",
  "Backup contains an unlinked batch image",
  "Backup contains an unsafe {item} storage path",
  "Backup contains too much JSON data",
  "Backup is missing {item}",
  "Backup is missing a valid source account ID",
  "Backup is missing the profile avatar file",
  "Backup metadata and profile must be JSON objects",
  "Backup ZIP must be 50 MB or smaller",
  "Could not export account data",
  "Could not export {item}: {details}",
  "Could not export private messages: {details}",
  "Could not export profile: {details}",
  "Could not read uploaded backup: {details}",
  "Could not upload backup: {details}",
  "Could not restore {item} file: {details}",
  "Could not restore profile settings: {details}",
  "Could not verify archived featured recipe: {details}",
  "Could not verify archived username: {details}",
  "Could not verify saved discussions: {details}",
  "Could not check saved discussions: {details}",
  "Invalid backup upload request",
  "Invalid backup file",
  "Restore stopped while importing {item}. {count} records were processed before the error: {details}",
  "Select a backup ZIP file",
  "Some saved discussions were not restored because they no longer exist.",
  "The archived featured recipe was not restored because it is unavailable.",
  "The archived username was kept unchanged because it is already in use.",
  "Unsupported backup format. Please upload a Batchlog backup.",
  "Upload a backup ZIP from your account",
  "Upload a valid backup ZIP file",
  "Vessel-sharing access was not recreated; ask each vessel owner to share access again.",
  "Your backup is larger than the 50 MB restore limit. Remove some large images and try again.",
  "Backup restored. Existing records were left unchanged; archived profile and settings were restored where possible.",
].map((key) => [key, key]));

export function translateAccountBackupMessage(
  message: string,
  t: (key: string) => string
) {
  const exact = translateApiError(message, t, ACCOUNT_BACKUP_ERROR_KEYS);
  if (exact !== message) return exact;

  const successPrefix =
    "Backup restored. Existing records were left unchanged; archived profile and settings were restored where possible.";
  if (message.startsWith(successPrefix)) {
    let translated = t(successPrefix);
    for (const warning of [
      "Some saved discussions were not restored because they no longer exist.",
      "Vessel-sharing access was not recreated; ask each vessel owner to share access again.",
      "The archived featured recipe was not restored because it is unavailable.",
      "The archived username was kept unchanged because it is already in use.",
    ]) {
      if (message.includes(warning)) translated += ` ${t(warning)}`;
    }
    return translated;
  }

  const templates: [RegExp, string, string[]][] = [
    [/^Backup is missing (.+)$/, "Backup is missing {item}", ["item"]],
    [/^(.+) contains invalid records$/, "{item} contains invalid records", ["item"]],
    [/^(.+) is too large$/, "{item} is too large", ["item"]],
    [/^(.+) is not valid JSON$/, "{item} is not valid JSON", ["item"]],
    [/^Could not read uploaded backup: (.+)$/, "Could not read uploaded backup: {details}", ["details"]],
    [/^Could not upload backup: (.+)$/, "Could not upload backup: {details}", ["details"]],
    [/^Could not restore (.+) file: (.+)$/, "Could not restore {item} file: {details}", ["item", "details"]],
    [/^Could not restore profile settings: (.+)$/, "Could not restore profile settings: {details}", ["details"]],
    [/^Could not verify archived featured recipe: (.+)$/, "Could not verify archived featured recipe: {details}", ["details"]],
    [/^Could not verify archived username: (.+)$/, "Could not verify archived username: {details}", ["details"]],
    [/^Could not verify saved discussions: (.+)$/, "Could not verify saved discussions: {details}", ["details"]],
    [/^Could not check saved discussions: (.+)$/, "Could not check saved discussions: {details}", ["details"]],
    [/^Could not export private messages: (.+)$/, "Could not export private messages: {details}", ["details"]],
    [/^Could not export profile: (.+)$/, "Could not export profile: {details}", ["details"]],
    [/^Could not export (.+): (.+)$/, "Could not export {item}: {details}", ["item", "details"]],
    [/^A (.+) file has an invalid URL$/, "A {item} file has an invalid URL", ["item"]],
    [/^A (.+) file has an invalid storage path$/, "A {item} file has an invalid storage path", ["item"]],
    [/^A (.+) file has an unsafe storage path$/, "A {item} file has an unsafe storage path", ["item"]],
    [/^Backup contains an invalid (.+) URL$/, "Backup contains an invalid {item} URL", ["item"]],
    [/^Backup contains an invalid (.+) storage path$/, "Backup contains an invalid {item} storage path", ["item"]],
    [/^Backup contains an unsafe (.+) storage path$/, "Backup contains an unsafe {item} storage path", ["item"]],
    [
      /^Restore stopped while importing (.+)\. (\d+) records were processed before the error: (.+)$/,
      "Restore stopped while importing {item}. {count} records were processed before the error: {details}",
      ["item", "count", "details"],
    ],
  ];
  for (const [pattern, key, placeholders] of templates) {
    const match = pattern.exec(message);
    if (!match) continue;
    return placeholders.reduce(
      (translated, placeholder, index) =>
        translated.replace(`{${placeholder}}`, match[index + 1]),
      t(key)
    );
  }
  return message;
}

export const ACCOUNT_PROFILE_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "An appeal has already been submitted for this action.",
  "Appeal was submitted, but its audit record could not be written.",
  "Appeals must include between 10 and 3000 characters.",
  "Authentication required",
  "Authentication required.",
  "An appeal can only be sent while your account is banned.",
  "You have already sent an appeal. You can only reply when an admin requests more information.",
  "Invalid appeal details",
  "Write between 3 and 3000 characters for your message.",
  "Write between 3 and 3000 characters.",
  "Could not submit your appeal.",
  "Could not send your appeal. Please try again.",
  "Could not check account restrictions.",
  "Could not check username availability.",
  "Could not load moderation history",
  "Could not load profile",
  "Could not submit appeal",
  "Could not update username.",
  "Enter a username.",
  "Invalid JSON body",
  "Invalid request body.",
  "Invalid token",
  "Missing token",
  "That username is already taken. Please choose another.",
  "This moderation action cannot be appealed.",
  "Username must be between 1 and 64 characters.",
  "A username of 1 to 64 characters is required.",
].map((key) => [key, key]));

export function translateAccountProfileError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, ACCOUNT_PROFILE_ERROR_KEYS);
}

export const AUTH_API_ERROR_KEYS: Record<string, string> = {
  "Invalid JSON body": "Invalid JSON body",
  "A session is required": "A session is required",
  "Could not clear session": "Could not clear session",
  "A valid session is required": "A valid session is required",
  "Could not synchronize session": "Could not synchronize session",
  "A username of 1 to 64 characters is required.": "A username of 1 to 64 characters is required.",
  "Could not check username availability.": "Could not check username availability.",
  "Invalid signup request.": "Invalid signup request.",
  "Please provide valid signup details.": "Please provide valid signup details.",
  "Could not start signup. Check the server log for details.": "Could not start signup. Check the server log for details.",
  "Could not create account.": "Could not create account.",
  "Authentication required.": "Authentication required",
  "Invalid profile details.": "Invalid profile details.",
  "Account created, but profile setup failed. Please contact support.": "Account created, but profile setup failed. Please contact support.",
};

export const SIGNUP_AUTH_CODE_KEYS: Record<string, string> = {
  email_exists: "An account with this email already exists.",
  user_already_exists: "An account with this email already exists.",
  email_address_invalid: "Enter a valid email address.",
  weak_password: "This password does not meet the security requirements.",
  over_email_send_rate_limit: "Too many emails requested. Please try again later.",
  over_request_rate_limit: "Too many requests. Please try again later.",
  signup_disabled: "Account registration is currently unavailable.",
};

export const LOGIN_AUTH_CODE_KEYS: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email address before logging in.",
  over_request_rate_limit: "Too many requests. Please try again later.",
};

export const LOGIN_AUTH_MESSAGE_KEYS: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password.",
  "Email not confirmed": "Please confirm your email address before logging in.",
};

export const BATCH_REMINDER_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Invalid batch ID",
  "Could not load reminder preferences",
  "Could not load batch reminders",
  "Could not load SG reminders",
  "Could not create SG reminders",
  "Could not count unread reminders",
  "Brew reminders are disabled in your settings",
  "Invalid JSON body",
  "Enter a valid batch, future reminder time, and message up to 300 characters",
  "Could not verify batch ownership",
  "Batch not found",
  "Could not create batch reminder",
  "A list of reminder IDs is required",
  "Could not update reminders",
  "Could not clear batch notifications",
  "Valid reminder ID is required",
  "Could not delete reminder",
  "Reminder not found",
].map((key) => [key, key]));

export const BREW_DAY_CHECKLIST_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Invalid batch ID",
  "Apply the brew-day checklist database migration to save progress.",
  "Could not load batch brew-day checklist",
  "Could not verify batch access",
  "Batch not found",
  "Batch access denied",
  "Invalid JSON body",
  "Saved checklist data is invalid and could not be loaded.",
  "Enter valid brew-day checklist data.",
  "Could not save batch brew-day checklist",
  "Saved brew-day checklist data has an unsupported format.",
  "Saved brew-day checklist has invalid step data.",
  "Saved brew-day checklist has invalid timer settings.",
  "Saved brew-day checklist has an invalid timer duration.",
  "Saved brew-day checklist has invalid timer data.",
].map((key) => [key, key]));

export const VESSEL_CONTRIBUTOR_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required.",
  "Vessel not found.",
  "Could not load contributors.",
  "Invalid request body.",
  "Choose a valid friend.",
  "You cannot add yourself as a contributor.",
  "You can only share a vessel with a friend.",
  "Friend not found.",
  "Could not add this contributor.",
  "Vessel owners cannot leave their own vessel.",
  "You are not a contributor to this vessel.",
  "Contributor is required.",
  "Could not remove this contributor.",
  "Contributor added, but the activity history could not be updated.",
  "Contributor removed, but the activity history could not be updated.",
  "You left the vessel, but the activity history could not be updated.",
].map((key) => [key, key]));

export const SPLIT_BATCH_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Invalid batch ID",
  "Authentication required",
  "Invalid request body",
  "Choose at least two vessels and enter a valid volume for each.",
  "Each portion must go into a different vessel.",
  "Apply the batch-splitting database migration before splitting batches.",
  "Only an active batch can be split.",
  "Batch not found or access denied.",
  "Choose at least two valid vessel allocations.",
  "Enter a positive volume with no more than four decimal places.",
  "The allocated volumes cannot exceed the source batch volume.",
  "One of the selected vessels is unavailable.",
  "One of the selected vessels already contains an active batch.",
  "The database still requires the full volume to be allocated. Update the split_batch function to record transfer loss, then try again.",
  "Could not split this batch. Please try again.",
].map((key) => [key, key]));

export const CONDITIONING_ENTRY_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Batch ID and vessel ID are required",
  "Choose a valid conditioning action",
  "Enter a valid conditioning date and time",
  "Could not determine the time zone for this entry",
  "Notes must be 3000 characters or fewer",
  "Only your own currently public recipes and batches can be tagged.",
  "Conditioning details must be 200 characters or fewer",
  "Enter agent",
  "Enter product",
  "Enter sweetener",
  "Enter adjustment",
  "Enter description",
  "Enter a valid amount",
  "Enter a valid volume",
  "Enter a valid volume loss",
  "Enter a valid gravity",
  "Enter a valid temperature",
  "Enter a valid wait time",
  "Enter a valid target tasting date",
  "Conditioning entries can only be added to a batch in conditioning",
  "Vessel not found",
  "You do not have permission to update this vessel",
  "Could not verify batch: {details}",
  "Could not verify vessel: {details}",
  "Could not verify vessel access: {details}",
  "Could not save conditioning entry: {details}",
].map((key) => [key, key]));

export const BOTTLE_AGING_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Invalid batch ID",
  "Authentication required",
  "Could not load bottle aging",
  "Batch not found",
  "Bottle aging is available after finishing the batch.",
  "Apply the bottle aging database migration to use this feature.",
  "Could not load bottle aging.",
  "Could not load tasting notes.",
  "Could not load bottle aging reminder.",
  "Invalid JSON body",
  "Invalid request body",
  "Could not verify batch ownership.",
  "Unsupported bottle aging action.",
  "Enter a valid tasting date and notes up to 2000 characters.",
  "Could not verify bottle aging.",
  "Start bottle aging before adding a tasting.",
  "This bottle aging record is complete.",
  "Could not save tasting notes.",
  "Enter a valid tasting date and reminder time.",
  "Enter a valid tasting date and future reminder time.",
  "Could not start bottle aging.",
  "Bottle aging has already been started for this batch.",
  "Could not verify reminder settings.",
  "Enable batch reminders in settings to schedule a tasting reminder.",
  "The reminder could not be scheduled and the incomplete aging record could not be removed. Contact support.",
  "Bottle aging was not started because the reminder could not be scheduled.",
  "The reminder could not be linked and incomplete bottle-aging data could not be fully removed. Contact support.",
  "Bottle aging was not started because the reminder could not be linked.",
  "Could not complete bottle aging.",
  "Bottle aging record not found.",
  "The reminder could not be cleared and bottle aging could not be restored to its open state. Contact support.",
  "Could not complete bottle aging because its reminder could not be cleared.",
  "Could not save bottle aging.",
].map((key) => [key, key]));

export const BATCH_UPDATE_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Batch ID and vessel ID are required",
  "Enter a valid batch name, volume, start date, and original gravity.",
  "Could not verify batch: {details}",
  "Batch not found or access denied",
  "Missing {field} batch data.",
  "Invalid {field} batch data.",
  "Invalid saved dry-hop additions.",
  "Enter a valid EBC value for every malt addition.",
  "Enter hop alpha acid and time, plus a whirlpool temperature between 0 and 100°C.",
  "Enter an alpha-acid value between 0 and 100 for every dry-hop addition.",
  "Choose a valid brewing method.",
  "Choose a valid beer style.",
  "Enter a valid boil volume.",
  "Enter the IBU and EBC values shown on the fresh wort kit.",
  "Style or type must be 80 characters or fewer.",
  "Only your own currently public recipes and batches can be tagged.",
  "Could not load the first SG reading: {details}",
  "Could not update the first SG reading: {details}",
  "Could not update the first SG reading because access was denied",
  "Could not add the initial SG reading: {details}",
  "Could not update batch: {details}",
  "Could not update batch because access was denied",
].map((key) => [key, key]));

export const BATCH_INSIGHTS_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Invalid batch ID",
  "Authentication required",
  "Apply the batch lifecycle migration to view batch insights.",
  "Could not load batch insights",
  "Could not load batch insights.",
  "Batch insights were missing from the response.",
  "Batch not found",
  "Batch insights are available after packaging and finishing the batch.",
  "Could not load batch gravity history.",
  "Could not load batch notes.",
  "Could not load batch conditioning activity.",
].map((key) => [key, key]));

export const BATCH_MOVE_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Invalid request body",
  "Select a valid active batch and a different target vessel.",
  "Could not verify vessel access.",
  "Only your own vessels can be used for this move.",
  "Could not load the active batch.",
  "The batch is no longer in that vessel.",
  "Could not check whether the destination vessel is empty.",
  "That vessel already contains an active batch.",
  "Could not move the batch. Please try again.",
  "The batch changed before it could be moved. Refresh and try again.",
  "The batch moved, but vessel status did not update. Refresh the dashboard.",
  "Could not leave the shared vessel. Please try again.",
].map((key) => [key, key]));

export const VESSEL_VISIBILITY_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Missing vessel ID",
  "Not authenticated",
  "Vessel not found",
  "Not allowed to modify this vessel",
  "Failed to update visibility",
  "Unexpected server error",
  "Could not update vessel visibility. Please try again.",
].map((key) => [key, key]));

export function translateVesselVisibilityError(
  message: string,
  t: (key: string) => string
) {
  return translateApiError(message, t, VESSEL_VISIBILITY_ERROR_KEYS);
}

export const BATCH_RECIPE_LINK_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Invalid batch ID",
  "Authentication required",
  "Invalid request body",
  "Could not load batch recipe-link settings",
  "Batch not found",
  "Only the brewer can link a recipe to this batch",
  "Only finished batches can be linked for community sharing.",
  "Could not check for a recipe saved from this batch",
  "Could not load recipes for this batch",
  "Select a valid recipe",
  "Could not verify the selected recipe",
  "The selected recipe was not found",
  "Choose a recipe with the same batch type",
  "Apply the batch lifecycle database migration before linking recipes.",
  "Could not link the selected recipe to this batch",
  "Batch not found or access denied",
].map((key) => [key, key]));

export const BATCH_OUTCOME_SHARING_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Invalid batch ID",
  "Authentication required",
  "Invalid request body",
  "Invalid sharing settings",
  "Tasting notes can only be shared with a batch outcome.",
  "Apply the batch lifecycle database migration before sharing results.",
  "Could not update outcome sharing",
  "Batch not found",
  "Only the brewer can change sharing settings",
  "Only finished batches can be shared.",
  "Link this batch to a recipe before sharing its outcome.",
  "Could not verify sharing eligibility",
  "Make both your source recipe and profile public before sharing this outcome.",
  "Could not save outcome sharing",
  "Batch not found or access denied",
].map((key) => [key, key]));

export function translateBatchError(message: string, t: (key: string) => string) {
  const batchDataError = /^(Missing|Invalid) (malts_json|hops_json|dry_hops_json|fruits_json|ingredients_json) batch data\.$/.exec(message);
  if (batchDataError) {
    const key = `${batchDataError[1]} {field} batch data.`;
    return t(key).replace("{field}", () => batchDataError[2]);
  }

  for (const [prefix, template] of [
    ["Could not verify batch: ", "Could not verify batch: {details}"],
    ["Could not verify vessel: ", "Could not verify vessel: {details}"],
    ["Could not verify vessel access: ", "Could not verify vessel access: {details}"],
    ["Could not save conditioning entry: ", "Could not save conditioning entry: {details}"],
    ["Could not load the first SG reading: ", "Could not load the first SG reading: {details}"],
    ["Could not update the first SG reading: ", "Could not update the first SG reading: {details}"],
    ["Could not add the initial SG reading: ", "Could not add the initial SG reading: {details}"],
    ["Could not update batch: ", "Could not update batch: {details}"],
  ]) {
    if (message.startsWith(prefix)) {
      return t(template).replace("{details}", () => message.slice(prefix.length));
    }
  }

  for (const keys of [
    BATCH_REMINDER_ERROR_KEYS,
    BREW_DAY_CHECKLIST_ERROR_KEYS,
    VESSEL_CONTRIBUTOR_ERROR_KEYS,
    SPLIT_BATCH_ERROR_KEYS,
    CONDITIONING_ENTRY_ERROR_KEYS,
    BOTTLE_AGING_ERROR_KEYS,
    BATCH_UPDATE_ERROR_KEYS,
    BATCH_INSIGHTS_ERROR_KEYS,
    BATCH_MOVE_ERROR_KEYS,
    BATCH_RECIPE_LINK_ERROR_KEYS,
    BATCH_OUTCOME_SHARING_ERROR_KEYS,
  ]) {
    if (Object.hasOwn(keys, message)) return translateApiError(message, t, keys);
  }
  return message;
}

export function translateGeneratedGravityReminder(message: string, t: (key: string) => string) {
  const stale = /^No gravity reading has been logged for "([\s\S]*)" during (primary fermentation|secondary fermentation) in 7 days\. Consider taking a gravity reading\.$/.exec(message);
  if (stale) {
    return t("No gravity reading has been logged for “{batch}” during {stage} in 7 days. Consider taking a gravity reading.")
      .replace(/\{batch\}|\{stage\}/g, (placeholder) =>
        placeholder === "{batch}" ? stale[1] : t(stale[2])
      );
  }
  const stable = /^Gravity for "([\s\S]*)" has stayed within 0\.001 across three readings during (primary fermentation|secondary fermentation)\. Consider confirming the trend with another reading before treating fermentation as complete\.$/.exec(message);
  if (stable) {
    return t("Gravity for “{batch}” has stayed within 0.001 across three readings during {stage}. Consider confirming the trend with another reading before treating fermentation as complete.")
      .replace(/\{batch\}|\{stage\}/g, (placeholder) =>
        placeholder === "{batch}" ? stable[1] : t(stable[2])
      );
  }
  return message;
}

export function translateAuthApiError(message: string, t: (key: string) => string) {
  return translateApiError(message, t, AUTH_API_ERROR_KEYS);
}

export function translateAuthCode(
  code: string | undefined,
  t: (key: string) => string,
  codes: Record<string, string>
) {
  return code && Object.hasOwn(codes, code) ? t(codes[code]) : undefined;
}

export const RECIPE_ERROR_KEYS: Record<string, string> = {
  "Ikke innlogget": "Authentication required",
  "Not authenticated": "Authentication required",
  "Kunne ikke hente oppskriften": "Could not load recipe.",
  "Oppskrift ikke funnet": "Recipe not found",
  "Recipe not found.": "Recipe not found",
  "Recipe not found": "Recipe not found",
  "Kunne ikke slette oppskriften": "Could not delete this recipe.",
  "Kunne ikke oppdatere oppskriften": "Could not save the recipe.",
  "Serverfeil": "Server error.",
  ...Object.fromEntries([
    "Could not load recipe.",
    "Could not save the recipe.",
    "This recipe does not match the batch type.",
    "A valid recipe is required.",
    "Invalid recipe details.",
    "Only your own currently public recipes and batches can be tagged.",
    "Could not verify tagged items.",
    "Could not verify tagged items. Please try again.",
    "Choose a valid brewing method.",
    "Choose a valid beer style.",
    "Kit name, volume, OG, and yeast are required for kit recipes.",
    "Kit link must use http or https",
    "Kit link must use http or https.",
    "Invalid kit link",
    "Enter a valid kit link.",
    "Enter a time for every hop addition and a whirlpool temperature between 0 and 100°C.",
    "Dry hop additions must be a list.",
    "Dry hop alpha must be between 0 and 100%, and crop year must be a valid year.",
    "Enter the IBU and EBC values shown on the fresh wort kit.",
    "Could not load the current recipe",
    "Could not verify your recipe limit. Please try again.",
    "Copyright-free status must be true or false.",
    "Could not verify who owns this recipe's copyright status.",
    "A copied recipe inherits the copyright status of its source.",
    "Apply the recipe copyright migration before changing this setting.",
    "Sign in to make a recipe version.",
    "Invalid request body.",
    "Could not load the shared recipe.",
    "This recipe is no longer publicly available.",
    "Could not load recipe details. Please try again.",
    "Could not verify the shared recipe.",
    "Apply the community recipe database migration before making a version.",
    "Could not verify the community recipe post.",
    "This recipe is not shared in a community recipe post.",
    "Could not create your recipe version.",
    "Sign in to start a batch.",
    "Invalid recipe ID.",
    "Could not load this recipe.",
    "Could not verify this recipe's author.",
    "Could not check your saved recipes.",
    "Could not sync the recipe's copyright status.",
    "Could not save a private version of this recipe.",
  ].map((key) => [key, key])),
};

export function translateRecipeError(message: string, t: (key: string) => string) {
  const fieldError = /^Invalid (malts|hops|dry_hops|fruits|ingredients|steps|og|fg|abv|volume|boil_volume|ibu|ebc|boil_time|honey_amount|base_liquid_amount|sugar_amount) (data|value)\.$/.exec(message);
  if (fieldError) {
    const key = fieldError[2] === "data" ? "Invalid {field} data." : "Invalid {field} value.";
    return t(key).replace("{field}", () => fieldError[1]);
  }
  return Object.hasOwn(RECIPE_ERROR_KEYS, message)
    ? translateApiError(message, t, RECIPE_ERROR_KEYS)
    : translateRecipeImportError(message, t);
}

export const RECIPE_IMPORT_ERROR_KEYS: Record<string, string> = Object.fromEntries([
  "Authentication required",
  "Recipe files must be 2 MB or smaller.",
  "Upload a CSV, BeerXML, or BeerJSON file.",
  "Choose a CSV, BeerXML, or BeerJSON file.",
  "Choose a CSV, BeerXML, or BeerJSON file first.",
  "Choose a file with a .csv, .xml, .json, or .beerjson extension.",
  "Recipe files must be between 1 byte and 2 MB.",
  "Could not read the recipe file.",
  "Could not import recipes.",
  "Could not verify your recipe limit. Please try again.",
  "Recipes were parsed but could not be saved.",
  "Each imported recipe must have a name of 1–120 characters.",
  "BeerXML files with document type or entity declarations are not supported.",
  "No BeerXML recipes were found in this file.",
  "The selected file is not valid JSON.",
  "No BeerJSON recipe was found in this file.",
  "The CSV file contains an invalid quote.",
  "The CSV file has an unfinished quoted value.",
  "The CSV file is empty.",
  "The CSV file has duplicate or empty column names.",
  "The CSV file does not contain any recipes.",
  'The CSV contains an invalid "had_secondary" value.',
].map((key) => [key, key]));

export const RECIPE_IMPORT_ERROR_TEMPLATES = [
  "A file can contain at most {count} recipes.",
  'The CSV file is missing the required "{field}" column.',
  "CSV row {row} has a different number of columns than the header.",
  "The CSV contains an invalid {field} value.",
  'The CSV contains invalid JSON in the "{field}" column.',
  '"{name}" has an unsupported recipe type.',
  '"{name}" has an invalid batch volume.',
  "Free accounts can save up to {count} recipes. Delete a recipe or upgrade to Premium to save more.",
] as const;

const recipeImportPatterns: readonly [RegExp, string, string][] = [
  [/^A file can contain at most (\d+) recipes\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[0], "count"],
  [/^The CSV file is missing the required "(name|type|volume)" column\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[1], "field"],
  [/^CSV row (\d+) has a different number of columns than the header\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[2], "row"],
  [/^The CSV contains an invalid (batch volume|volume|og|fg|abv|ibu|ebc|honey_amount|base_liquid_amount|sugar_amount|boil_time|boil_volume) value\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[3], "field"],
  [/^The CSV contains invalid JSON in the "(fruits|malts|hops|dry_hops|ingredients|steps|malt_warnings|notes_log)" column\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[4], "field"],
  [/^"([\s\S]*)" has an unsupported recipe type\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[5], "name"],
  [/^"([\s\S]*)" has an invalid batch volume\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[6], "name"],
  [/^Free accounts can save up to (\d+) recipes\. Delete a recipe or upgrade to Premium to save more\.$/, RECIPE_IMPORT_ERROR_TEMPLATES[7], "count"],
];

export function translateRecipeImportError(message: string, t: (key: string) => string) {
  for (const [pattern, key, placeholder] of recipeImportPatterns) {
    const match = pattern.exec(message);
    if (match) {
      const value = match[1] === "batch volume" && placeholder === "field"
        ? t("batch volume")
        : match[1];
      return t(key).replace(`{${placeholder}}`, () => value);
    }
  }
  return translateApiError(message, t, RECIPE_IMPORT_ERROR_KEYS);
}
