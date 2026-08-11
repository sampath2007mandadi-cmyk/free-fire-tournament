import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return json(res, { success: true, teams: await db("teams?select=*&order=created_at.desc") });
    if (!["POST", "PUT", "DELETE"].includes(req.method)) return json(res, { success: false, error: "Method not allowed." }, 405);
    if (req.method !== "POST" && !requireAdmin(req, res)) return;

    const body = await readBody(req);
    if (req.method === "POST") {
      const players = Array.isArray(body.players) ? body.players.map(String).map(x => x.trim()).filter(Boolean) : [body.player1, body.player2, body.player3, body.player4].map(x => String(x || "").trim()).filter(Boolean);
      const team = { team_name: String(body.team_name || "").trim(), captain: String(body.captain || "").trim(), phone: String(body.phone || "").replace(/\D/g, ""), players };
      if (!team.team_name || !team.captain || team.phone.length < 10 || players.length !== 4) return json(res, { success: false, error: "Enter team name, captain, 10-digit phone and all 4 players." }, 400);
      const duplicate = await db(`teams?team_name=eq.${encodeURIComponent(team.team_name)}&select=id`);
      if (duplicate.length) return json(res, { success: false, error: "That team name is already registered." }, 409);
      const rows = await db("teams?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(team) });
      const created = rows[0];
      await db("leaderboard?select=*", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ team_id: created.id, played: 0, kills: 0, points: 0 }) });
      return json(res, { success: true, team: created }, 201);
    }

    if (!body.id) return json(res, { success: false, error: "Team ID is required." }, 400);
    if (req.method === "PUT") {
      const updates = {};
      if (body.team_name !== undefined) updates.team_name = String(body.team_name).trim();
      if (body.captain !== undefined) updates.captain = String(body.captain).trim();
      if (body.phone !== undefined) updates.phone = String(body.phone).replace(/\D/g, "");
      if (body.players !== undefined) updates.players = body.players;
      const rows = await db(`teams?id=eq.${encodeURIComponent(body.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) });
      return json(res, { success: true, team: rows[0] });
    }
    await db(`teams?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
    await db(`leaderboard?team_id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
    await db(`tournament_entries?team_id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) { console.error(error); return json(res, { success: false, error: error.message || "Server error." }, error.status || 500); }
}
