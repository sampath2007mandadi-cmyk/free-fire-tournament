import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await db("leaderboard?select=team_id,played,kills,points,teams(team_name)&order=points.desc");
      return json(res, { success: true, leaderboard: (rows || []).map(r => ({ team_id: r.team_id, name: r.teams?.team_name || "Unknown Team", played: r.played || 0, kills: r.kills || 0, points: r.points || 0 })) });
    }
    if (!["POST", "PUT", "DELETE"].includes(req.method)) return json(res, { success: false, error: "Method not allowed." }, 405);
    if (!requireAdmin(req, res)) return;
    const b = await readBody(req);
    if (!b.team_id) return json(res, { success: false, error: "Team ID is required." }, 400);
    if (req.method === "POST") {
      const rows = await db("leaderboard?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ team_id: Number(b.team_id), played: Number(b.played) || 0, kills: Number(b.kills) || 0, points: Number(b.points) || 0 }) });
      return json(res, { success: true, leaderboard: rows[0] }, 201);
    }
    if (req.method === "PUT") {
      const updates = { played: Math.max(0, Number(b.played) || 0), kills: Math.max(0, Number(b.kills) || 0), points: Math.max(0, Number(b.points) || 0) };
      const rows = await db(`leaderboard?team_id=eq.${encodeURIComponent(b.team_id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) });
      return json(res, { success: true, leaderboard: rows[0] });
    }
    await db(`leaderboard?team_id=eq.${encodeURIComponent(b.team_id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) { console.error(error); return json(res, { success: false, error: error.message || "Server error." }, error.status || 500); }
}
