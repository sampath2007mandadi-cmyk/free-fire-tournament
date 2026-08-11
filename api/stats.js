import { supabase } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed."
      });
    }

    const { count: teamCount, error: teamError } = await supabase
      .from("teams")
      .select("*", { count: "exact", head: true });

    if (teamError) throw teamError;

    const { count: entryCount, error: entryError } = await supabase
      .from("tournament_entries")
      .select("*", { count: "exact", head: true });

    if (entryError) throw entryError;

    const { count: approvedCount, error: approvedError } = await supabase
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("status", "APPROVED");

    if (approvedError) throw approvedError;

    const { count: pendingCount, error: pendingError } = await supabase
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");

    if (pendingError) throw pendingError;

    return res.status(200).json({
      success: true,
      stats: {
        total_registered_teams: teamCount || 0,
        total_tournament_entries: entryCount || 0,
        approved_entries: approvedCount || 0,
        pending_entries: pendingCount || 0
      }
    });

  } catch (error) {
    console.error("Stats API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server error."
    });
  }
}
