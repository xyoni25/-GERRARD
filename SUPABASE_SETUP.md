# One-time portfolio access setup

Customers choose a plan on `members.html`, make one manual Telebirr or CBE transfer, and send the selected plan and payment details to the owner in Telegram. The screenshot is previewed locally in the browser; the page does not upload it to a server. Verify each payment yourself, then issue a one-time code for the selected plan. Redeeming the code grants access for that term. This is not recurring billing, and opening Telegram or sending a receipt never approves a payment or grants access.

## 1. Deploy with Cloudflare Pages and Supabase

1. Create a Supabase project and enable email/password sign-in for accounts that receive portfolio access.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. It creates or updates the memberships and access-code schema, the private `payment-receipts` bucket (5 MB maximum; JPEG, PNG and WebP only), the receipt-submission table, and owner-scoped RLS policies. The receipt bucket/table remain private and do not grant access.
3. Create a Cloudflare Pages project from this repository. Use the repository root (`.`) as the static output directory and no build command. Cloudflare Pages detects the `functions/_middleware.js` access gate.
4. In Cloudflare Pages project settings, add these environment variables for production (and preview if needed):
   - `SUPABASE_URL`: your Supabase project URL.
   - `SUPABASE_ANON_KEY`: your public anon/publishable key.
5. Copy the same URL and public key into `assets/js/supabase-config.js`.
6. Set the Supabase site URL to your deployed site and add `https://your-domain.example/members.html` to the allowed redirect URLs. Test the deployed site over HTTPS.

Do not add a Supabase `service_role` key to the website, `supabase-config.js`, or Cloudflare middleware. The middleware and client use only a public key plus the signed-in user's access token. Keep the `payment-receipts` bucket private. If a separate receipt-upload workflow is connected later, customers must only be able to submit their own pending receipt rows and access objects in their own user-ID folder; receipt status changes remain owner-only.

Every protected page and file checks for a signed-in account with an active membership: `expires_at` must be in the future, except that a `NULL expires_at` is deliberately treated as a grandfathered legacy membership so existing users are not locked out by this migration. New codes always grant a finite term. Customers must sign in through the site's configured authenticated flow; static file access does not enforce authentication.

Before Supabase is configured, protected pages return visitors to `members.html`. Opening pages as `file://` can demonstrate that redirect, but sign-in and access checks require the configured Supabase project. Actual protection for direct file requests requires deployment through Cloudflare Pages; static files opened locally do not have server-side access control.

## 2. Preserve existing memberships during migration

The schema is safe to re-run: it adds `expires_at` if missing and does not drop or overwrite an existing expiry. Existing membership rows whose `expires_at` is `NULL` remain active as legacy access. The migration intentionally does **not** invent an expiration date or silently revoke those accounts.

Review any legacy rows before deciding whether to set expiration dates:

```sql
select user_id, approved_at, expires_at
from public.memberships
where expires_at is null
order by approved_at;
```

Keep those rows grandfathered, or explicitly communicate a transition date and backfill only the accounts covered by that policy. For example, after notifying the affected owners/customers, set an agreed end date for selected accounts:

```sql
update public.memberships
set expires_at = '2027-01-31 23:59:59+00'
where user_id = '00000000-0000-0000-0000-000000000000'
  and expires_at is null;
```

Do not run a blanket backfill without an owner-approved transition policy. A legacy user who voluntarily redeems a newly paid code is changed to term-based access from the redemption time; this does not happen merely by running the migration. Existing unredeemed codes are assigned the safe one-month duration by the additive migration; new code issuance should always specify the plan.

## 3. Verify payments and issue a plan-duration code

1. Independently confirm the transfer with the payment provider. In the Telegram message, check the selected plan, duration, and total; the customer must attach the receipt image in the chat.
2. After confirming the correct amount, issue the matching code in Supabase SQL Editor. Choose one of the supported terms: `1`, `3`, `5`, or `12` months.

   ```sql
   -- Example: verified 3-month payment (1,400 ETB)
   select public.create_access_code(3);
   ```

3. Send the returned code privately to that customer. It is a random 32-character code, stored only as a SHA-256 hash, valid for 7 days, and redeemable once by one signed-in account. Its stored duration grants the selected number of months.

An existing no-argument call, `select public.create_access_code();`, remains available for compatibility and issues a 1-month code. Prefer the explicit duration argument for every payment so the code matches the plan selected by the customer.

Redemption is atomic: the code is locked while it is redeemed, so it cannot grant access to multiple accounts. For an active membership, a new code extends from its current expiration; for an expired or legacy (no-expiration) membership, the new term starts at redemption time. An unused code expires after 7 days; generate a new code if it expires before use. A new payment and code are always manual—there is no recurring charge.

To revoke a customer's access, open Authentication → Users, copy their user ID, and run:

```sql
delete from public.memberships
where user_id = '00000000-0000-0000-0000-000000000000';
```

## 4. Private receipt storage (if used by a separate workflow)

The schema retains the private `payment-receipts` bucket and `receipt_submissions` table with owner-scoped policies. The current `members.html` flow does **not** upload images to Supabase or create receipt rows; the customer attaches the screenshot directly in Telegram. Never tell a customer that a page upload succeeded or treat a receipt submission as an approval. If the site later adds a dedicated upload workflow, inspect the private object and independently confirm payment before issuing a code.
