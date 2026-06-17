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
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };
  const assigneeList = TEAM_ACCOUNTS.map(a => `"${a}"`).join(",");
  // current work + completed history (56d) for velocity trend
  // Works for both Scrum (openSprints) and Kanban (created >= -30d) boards
  const jql = encodeURIComponent(
    `project = H20 AND issuetype in (Story, Bug, Task) ` +
    `AND (assignee in (${assigneeList}) OR assignee is EMPTY) ` +
    `AND (sprint in openSprints() OR created >= -30d OR resolutiondate >= -56d) ORDER BY created DESC`
  );
  const fields = "summary,customfield_10016,issuetype,assignee,status,created,resolutiondate,parent";

  try {
    // Fetch issues + active sprint info in parallel
    const [issuesRes, boardsRes] = await Promise.all([
      fetch(
        `https://${JIRA_SITE}/rest/api/3/search/jql?jql=${jql}&fields=${fields}&maxResults=100`,
        { headers }
      ),
      fetch(
        `https://${JIRA_SITE}/rest/agile/1.0/board?projectKeyOrId=H20&type=scrum`,
        { headers }
      ).catch(() => null)
    ]);

    if (!issuesRes.ok) {
      const text = await issuesRes.text();
      return res.status(issuesRes.status).json({ error: `Jira API ${issuesRes.status}: ${text.slice(0, 200)}` });
    }
    const data = await issuesRes.json();
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

    // Try to get active sprint dates
    let sprint = null;
    try {
      if (boardsRes && boardsRes.ok) {
        const boards = await boardsRes.json();
        const boardId = boards.values?.[0]?.id;
        if (boardId) {
          const sprintRes = await fetch(
            `https://${JIRA_SITE}/rest/agile/1.0/board/${boardId}/sprint?state=active`,
            { headers }
          );
          if (sprintRes.ok) {
            const sprintData = await sprintRes.json();
            const active = sprintData.values?.[0];
            if (active) {
              sprint = {
                name: active.name,
                startDate: active.startDate,
                endDate: active.endDate,
                state: active.state,
              };
            }
          }
        }
      }
    } catch {}

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ issues, sprint, syncedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
