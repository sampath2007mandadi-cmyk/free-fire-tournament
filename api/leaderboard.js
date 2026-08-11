import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await db("leaderboard?select=team_id,played,kills,points,teams(team_name)&order=points.desc");
      const leaderboard = (rows || []).map(r => ({
        team_id: r.team_id,
        name: r.teams?.team_name || "Unknown Team",
        played: r.played,
        kills: r.kills,
        points: r.points
      }));
      return json(res, { success: true, leaderboard });
    }

    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
      return json(res, { success: false, error: "Method not allowed." }, 405);
    }
    if (!requireAdmin(req, res)) return;

    const body = await readBody(req);

    if (req.method === "POST") {
      if (!body.team_id) return json(res, { success: false, error: "Team ID is required." }, 400);
      const rows = await db("leaderboard?select=*&", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ team_id: Number(body.team_id), played: Number(body.played) || 0, kills: Number(body.kills) || 0, points: Number(body.points) || 0 })
      });
      return json(res, { success: true, leaderboard: rows[0] }, 201);
    }

    if (req.method === "PUT") {
      if (!body.team_id) return json(res, { success: false, error: "Team ID is required." }, 400);
      const updates = {};
      if (body.played !== undefined) updates.played = Math.max(0, Number(body.played) || 0);
      if (body.kills !== undefined) updates.kills = Math.max(0, Number(body.kills) || 0);
      if (body.points !== undefined) updates.points = Math.max(0, Number(body.points) || 0);
      const rows = await db(`leaderboard?team_id=eq.${encodeURIComponent(body.team_id)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(updates)
      });
      return json(res, { success: true, leaderboard: rows[0] });
    }

    if (!body.team_id) return json(res, { success: false, error: "Team ID is required." }, 400);
    await db(`leaderboard?team_id=eq.${encodeURIComponent(body.team_id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Server error." }, error.status || 500);
  }
}
