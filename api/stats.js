import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const [teams, entries, approved, pending] = await Promise.all([
        db("teams?select=id"),
        db("tournament_entries?select=id"),
        db("tournament_entries?select=id&status=eq.PAID"),
        db("tournament_entries?select=id&status=eq.PENDING")
      ]);
      return json(res, { success: true, stats: {
        total_registered_teams: teams.length,
        total_tournament_entries: entries.length,
        approved_entries: approved.length,
        pending_entries: pending.length
      }});
    }

    if (req.method !== "PUT") return json(res, { success: false, error: "Method not allowed." }, 405);
    if (!requireAdmin(req, res)) return;

    const body = await readBody(req);
    const teamId = Number(body.team_id);
    if (!teamId) return json(res, { success: false, error: "Team ID is required." }, 400);

    const updates = {
      played: Math.max(0, Number(body.played) || 0),
      kills: Math.max(0, Number(body.kills) || 0),
      points: Math.max(0, Number(body.points) || 0)
    };

    const existing = await db(`leaderboard?team_id=eq.${teamId}&select=team_id`);
    let rows;
    if (existing.length) {
      rows = await db(`leaderboard?team_id=eq.${teamId}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(updates)
      });
    } else {
      rows = await db("leaderboard?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ team_id: teamId, ...updates })
      });
    }

    return json(res, { success: true, leaderboard: rows[0] });
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Server error." }, error.status || 500);
  }
}
