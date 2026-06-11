# Ozi H20 Sprint Budget — Live Jira Edition

## Setup (one time, ~3 minutes)

1. Deploy:
   ```bash
   npx vercel --prod
   ```

2. Add environment variables in Vercel dashboard
   (Project → Settings → Environment Variables):
   - `JIRA_EMAIL` = uttkarsh.rastogi@ozi.in
   - `JIRA_TOKEN` = your Jira API token (generate a FRESH one at id.atlassian.com → Security → API tokens)
   - `JIRA_SITE`  = ozians.atlassian.net (optional, this is the default)

3. Redeploy once after adding env vars:
   ```bash
   npx vercel --prod
   ```

## How it works
- Page load / ↻ button → /api/issues (Vercel serverless) → Jira REST API → live data
- Issue list, points, Jira assignee, Jira status: always live
- Your assignments / local status / exclusions: saved in your browser
- New tickets in Jira appear on next refresh automatically

## Security note
The Jira token stays server-side in Vercel env vars — never sent to the browser.
IMPORTANT: if a token was ever pasted in chat/Slack/etc, revoke it and generate a new one.
