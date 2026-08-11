import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const rows = await db("tournament_entries?select=*,teams(team_name)&order=created_at.desc");
      const entries = (rows || []).map(e => ({
        ...e,
        team_name: e.teams?.team_name || "Unknown Team"
      }));
      return json(res, { success: true, entries });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const team_id = Number(body.team_id);
      const tournament = body.tournament || body.tournament_name;
      const payer_name = String(body.payer_name || "").trim();
      const utr = String(body.utr || "").trim();

      if (!team_id || !tournament || !payer_name || !utr) {
        return json(res, { success: false, error: "Team, tournament, payer name and UTR are required." }, 400);
      }

      const existing = await db(`tournament_entries?team_id=eq.${team_id}&tournament=eq.${encodeURIComponent(tournament)}&select=id`);
      if (existing.length) {
        return json(res, { success: false, error: "This team has already requested entry for this tournament." }, 409);
      }

      const rows = await db("tournament_entries?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ team_id, tournament, amount: 200, payer_name, utr, status: "PENDING" })
      });
      return json(res, { success: true, entry: rows[0] }, 201);
    }

    if (!["PUT", "DELETE"].includes(req.method)) {
      return json(res, { success: false, error: "Method not allowed." }, 405);
    }
    if (!requireAdmin(req, res)) return;

    const body = await readBody(req);
    if (!body.id) return json(res, { success: false, error: "Entry ID is required." }, 400);

    if (req.method === "PUT") {
      const status = String(body.status || "").toUpperCase();
      if (!["PENDING", "PAID", "REJECTED"].includes(status)) {
        return json(res, { success: false, error: "Invalid entry status." }, 400);
      }
      const rows = await db(`tournament_entries?id=eq.${encodeURIComponent(body.id)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status })
      });
      return json(res, { success: true, entry: rows[0] });
    }

    await db(`tournament_entries?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Server error." }, error.status || 500);
  }
}
