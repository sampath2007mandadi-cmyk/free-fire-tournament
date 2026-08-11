import { db, json, requireAdmin } from "../lib/server.mjs";

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

    const body = await (async () => {
      if (bodyCache) return bodyCache;
      return {};
    })();
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Server error." }, error.status || 500);
  }
}

let bodyCache = null;
