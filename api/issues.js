// Vercel serverless — live H20 issues for the frontend team + history for velocity

export default async function handler(req, res) {
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_TOKEN = process.env.JIRA_TOKEN;
  const JIRA_SITE = process.env.JIRA_SITE || "ozians.atlassian.net";

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return res.status(500).json({ error: "JIRA_EMAIL and JIRA_TOKEN env vars not configured" });
  }

  const TEAM_ACCOUNTS = [
    "712020:ca6db9cf-d6a5-473e-84af-009f8d76d495", // Uttkarsh Rastogi
    "712020:4425e44f-3c52-44cb-9b4f-f4b5bedd05a2", // Vishal Roy
    "712020:ce719305-f416-47a8-991d-ddddb556a98b", // Yash Jangir
  ];

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64");
  const assigneeList = TEAM_ACCOUNTS.map(a => `"${a}"`).join(",");
  // current sprint tickets + completed history (56d) for velocity trend
  const jql = encodeURIComponent(
    `project = H20 AND issuetype in (Story, Bug, Task) ` +
    `AND (assignee in (${assigneeList}) OR assignee is EMPTY) ` +
    `AND (sprint in openSprints() OR resolutiondate >= -56d) ORDER BY created DESC`
  );
  const fields = "summary,customfield_10016,issuetype,assignee,status,created,resolutiondate,parent";

  try {
    const r = await fetch(
      `https://${JIRA_SITE}/rest/api/3/search/jql?jql=${jql}&fields=${fields}&maxResults=100`,
      { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } }
    );
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Jira API ${r.status}: ${text.slice(0, 200)}` });
    }
    const data = await r.json();
    const issues = (data.issues || []).map(i => ({
      key: i.key,
      summary: i.fields?.summary || "",
      points: i.fields?.customfield_10016 ?? null,
      type: i.fields?.issuetype?.name || "Task",
      jira: i.fields?.assignee?.displayName || null,
      jiraStatus: i.fields?.status?.name || "To Do",
      created: i.fields?.created || null,
      resolved: i.fields?.resolutiondate || null,
      epicKey: i.fields?.parent?.key || null,
      epicTitle: i.fields?.parent?.fields?.summary || null,
    }));
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ issues, syncedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
