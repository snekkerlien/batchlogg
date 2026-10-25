# Staff email notifications

Staff email notifications are currently on hold until a verified sending
domain is available. They are disabled unless `EMAIL_NOTIFICATIONS_ENABLED`
is explicitly set to `true`.

When enabled, Batchlogg sends staff notifications through Resend when a member
submits feedback, a community report is created, or a business-account
application or ban appeal is submitted. All notification emails go only to
accounts with the Developer role.

## Configure Resend

1. Create a Resend account and verify a sending domain.
2. Create an API key with permission to send email.
3. Set these server-side environment variables in local development and the
   deployment environment:

   ```text
   EMAIL_NOTIFICATIONS_ENABLED=true
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=Batchlogg <notifications@your-verified-domain.example>
   ```

   `RESEND_FROM_EMAIL` must use an address on the verified Resend domain.
   `NEXT_PUBLIC_APP_URL` is optional; it sets the review-link base URL and
   defaults to `https://batchlogg.vercel.app`.
4. Only enable `EMAIL_NOTIFICATIONS_ENABLED=true` once you have a verified
   sending domain and are ready to send. Restart the development server or
   redeploy after changing environment variables.

Recipient addresses come from the email addresses of current Developer
accounts, so no fixed recipient address is required. Multiple accounts can
have the Developer role. Assign Developer in the admin user editor; existing
admins are not promoted automatically. Developers have the same administrative
permissions as admins and automatically receive Premium access.

If email delivery is not configured or fails, the submission remains saved,
the failure is logged on the server, and the submitter is told that the email
notification was not sent.
