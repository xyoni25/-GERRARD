# One-time portfolio access setup

Customers create an account, pay once using the Telebirr or CBE details on `members.html`, and upload their receipt while signed in. Receipts are stored in a private Supabase bucket and linked to their account. Review each payment yourself; after verification, issue a one-time access code. Redeeming that code grants permanent access. Payment uploads never approve a customer or grant access automatically.

## 1. Deploy with Cloudflare Pages and Supabase

1. Create a Supabase project and enable email/password sign-in.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. It creates the membership/code schema, a private `payment-receipts` bucket (5 MB maximum; JPEG, PNG and WebP only), the receipt-submission table, and owner-scoped RLS policies.
3. Create a Cloudflare Pages project from this repository. Use the repository root (`.`) as the static output directory and no build command. Cloudflare Pages detects the `functions/_middleware.js` access gate.
4. In Cloudflare Pages project settings, add these environment variables for production (and preview if needed):
   - `SUPABASE_URL`: your Supabase project URL.
   - `SUPABASE_ANON_KEY`: your public anon/publishable key.
5. Copy the same URL and public key into `assets/js/supabase-config.js`.
6. Set the Supabase site URL to your deployed site and add `https://your-domain.example/members.html` to the allowed redirect URLs. Test the deployed site over HTTPS.

Do not add a Supabase `service_role` key to the website, `supabase-config.js`, or Cloudflare middleware. Customers can insert and view only their own pending receipt rows and access only objects in their own user-ID folder. They cannot set a receipt to approved, edit its status, or create a membership. The owner can review submissions in Supabase Studio; the Storage bucket must remain private.

The public unlock page and its minimal sign-in assets remain reachable so customers can create accounts, sign in, read payment instructions, and submit receipts. Every other HTML page checks the signed-in account and redirects unapproved visitors to `members.html` before showing page content. The Cloudflare middleware is the authoritative protection for direct requests to pages and files, including portfolio images and downloads. Do not create a second public copy of protected content.

Before Supabase is configured, all site pages intentionally redirect to `members.html`. Opening pages as `file://` can demonstrate that redirect, but sign-in, receipt submission, and approval checks require the configured Supabase project. Actual protection for direct file requests requires deployment through Cloudflare Pages; static files opened locally do not have server-side access control.

## 2. Review receipt submissions

1. In Supabase Studio, open **Table Editor → `receipt_submissions`** to see each submission's ID, user ID, private object path, MIME type, size, status, and timestamp. The customer-facing page shows only that customer's own rows.
2. Open **Storage → `payment-receipts`** to inspect or download the private image. Objects are stored under the uploader's UUID. Do not make this bucket public or copy receipts to a public site folder.
3. Independently confirm the transfer, then update the row's status in the Studio table editor (or as the project owner in SQL). `approved` means the receipt was manually verified; it does **not** grant portfolio access. For example:

   ```sql
   update public.receipt_submissions
   set status = 'approved'
   where id = 'RECEIPT-SUBMISSION-UUID';
   ```

   If you need to request clarification, use `rejected`; the customer will see “Follow-up needed.” Keep the receipt record for your review history.
4. Only after confirming payment, issue and send the customer a personal access code through a private channel.

## 3. Issue and redeem a one-time code

After verifying payment, run this in the Supabase SQL Editor:

```sql
select public.create_access_code();
```

Copy the returned code and send it privately to that customer. It is a random 32-character code, stored only as a SHA-256 hash, valid for 7 days, and can be redeemed once by one signed-in account. The customer signs into the website and enters the code on the unlock page. Successful redemption grants permanent access; the same customer never needs another payment or code.

Redemption is atomic, so the code cannot unlock more than one account even if multiple people try it at the same time. An unused code expires after 7 days; generate a new code if it expires before the customer uses it.

To revoke a customer's access, open Authentication → Users, copy their user ID, and run:

```sql
delete from public.memberships
where user_id = '00000000-0000-0000-0000-000000000000';
```
