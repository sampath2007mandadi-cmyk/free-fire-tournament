import { db, json, readBody, requireAdmin } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const rows = await db("tournament_entries?select=*,teams(team_name)&order=created_at.desc");
      return json(res, { success: true, entries: (rows || []).map(e => ({ ...e, team_name: e.teams?.team_name || "Unknown Team" })) });
    }
    if (req.method === "POST") {
      const b = await readBody(req);
      const team_id = Number(b.team_id), tournament = String(b.tournament || "NOVA SQUAD CUP #1").trim(), payer_name = String(b.payer_name || "").trim(), utr = String(b.utr || "").trim();
      if (!team_id || !payer_name || !utr) return json(res, { success: false, error: "Team, payer name and UTR are required." }, 400);
      const team = await db(`teams?id=eq.${team_id}&select=id`);
      if (!team.length) return json(res, { success: false, error: "Team not found." }, 404);
      const existing = await db(`tournament_entries?team_id=eq.${team_id}&tournament=eq.${encodeURIComponent(tournament)}&select=id`);
      if (existing.length) return json(res, { success: false, error: "This team already requested this tournament." }, 409);
      const rows = await db("tournament_entries?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ team_id, tournament, amount: 200, payer_name, utr, status: "PENDING" }) });
      return json(res, { success: true, entry: rows[0] }, 201);
    }
    if (!["PUT", "DELETE"].includes(req.method)) return json(res, { success: false, error: "Method not allowed." }, 405);
    if (!requireAdmin(req, res)) return;
    const b = await readBody(req);
    if (!b.id) return json(res, { success: false, error: "Entry ID is required." }, 400);
    if (req.method === "PUT") {
      const status = String(b.status || "").toUpperCase();
      if (!["PENDING", "PAID", "REJECTED"].includes(status)) return json(res, { success: false, error: "Invalid status." }, 400);
      const rows = await db(`tournament_entries?id=eq.${encodeURIComponent(b.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status }) });
      return json(res, { success: true, entry: rows[0] });
    }
    await db(`tournament_entries?id=eq.${encodeURIComponent(b.id)}`, { method: "DELETE" });
    return json(res, { success: true });
  } catch (error) { console.error(error); return json(res, { success: false, error: error.message || "Server error." }, error.status || 500); }
}
