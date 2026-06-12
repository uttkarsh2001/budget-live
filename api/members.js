// Vercel serverless — fetch assignable Jira users for the H20 project

export default async function handler(req, res) {
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_TOKEN = process.env.JIRA_TOKEN;
  const JIRA_SITE = process.env.JIRA_SITE || "ozians.atlassian.net";

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return res.status(500).json({ error: "JIRA_EMAIL and JIRA_TOKEN env vars not configured" });
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64");

  try {
    const r = await fetch(
      `https://${JIRA_SITE}/rest/api/3/user/assignable/search?project=H20&maxResults=50`,
      { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } }
    );
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Jira API ${r.status}: ${text.slice(0, 200)}` });
    }
    const data = await r.json();
    const members = (data || [])
      .filter(u => u.accountType === "atlassian")
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName || "",
        avatarUrl: u.avatarUrls?.["48x48"] || u.avatarUrls?.["32x32"] || null,
      }));
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ members });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
