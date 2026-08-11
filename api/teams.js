import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const teams = await db("teams?select=*&order=created_at.desc");
      return json(res, { success: true, teams: teams || [] });
    }

    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
      return json(res, { success: false, error: "Method not allowed." }, 405);
    }

    if (req.method !== "POST" && !requireAdmin(req, res)) return;

    const body = await readBody(req);

    if (req.method === "POST") {
      const { name, team_name, captain, captain_name, phone, captain_phone, players = [] } = body;
      const team = {
        team_name: team_name || name,
        captain: captain || captain_name,
        phone: String(phone || captain_phone || "").replace(/\D/g, ""),
        players: Array.isArray(players) ? players : [body.player1, body.player2, body.player3, body.player4].filter(Boolean)
      };

      if (!team.team_name || !team.captain || !team.phone || team.players.length !== 4) {
        return json(res, { success: false, error: "Team name, captain, phone and all 4 players are required." }, 400);
      }

      const rows = await db("teams?select=*&order=created_at.desc", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(team)
      });
      return json(res, { success: true, team: rows[0] }, 201);
    }

    if (req.method === "PUT") {
      const { id, name, team_name, captain, phone, players } = body;
      if (!id) return json(res, { success: false, error: "Team ID is required." }, 400);

      const updates = {};
      if (name !== undefined || team_name !== undefined) updates.team_name = team_name ?? name;
      if (captain !== undefined) updates.captain = captain;
      if (phone !== undefined) updates.phone = String(phone).replace(/\D/g, "");
      if (players !== undefined) updates.players = players;

      const rows = await db(`teams?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(updates)
      });
      return json(res, { success: true, team: rows[0] });
    }

    const { id } = body;
    if (!id) return json(res, { success: false, error: "Team ID is required." }, 400);
    await db(`teams?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Server error." }, error.status || 500);
  }
}
