import { supabase } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    // GET — public/admin: retrieve tournament entry requests
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("tournament_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        entries: data || []
      });
    }

    // POST — player submits tournament entry/payment request
    if (req.method === "POST") {
      const {
        team_id,
        tournament_name,
        payer_name,
        utr
      } = req.body || {};

      if (!team_id || !tournament_name || !payer_name || !utr) {
        return res.status(400).json({
          success: false,
          error: "Team, tournament, payer name and UTR are required."
        });
      }

      const { data: existing } = await supabase
        .from("tournament_entries")
        .select("id")
        .eq("team_id", team_id)
        .eq("tournament_name", tournament_name)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: "This team has already requested entry for this tournament."
        });
      }

      const { data, error } = await supabase
        .from("tournament_entries")
        .insert([
          {
            team_id,
            tournament_name,
            amount: 200,
            payer_name,
            utr,
            status: "PENDING"
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        entry: data
      });
    }

    // PUT — admin approves/rejects an entry
    if (req.method === "PUT") {
      const {
        id,
        status
      } = req.body || {};

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: "Entry ID and status are required."
        });
      }

      const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"];

      if (!allowedStatuses.includes(String(status).toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: "Invalid entry status."
        });
      }

      const { data, error } = await supabase
        .from("tournament_entries")
        .update({
          status: String(status).toUpperCase()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        entry: data
      });
    }

    // DELETE — admin removes an entry
    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Entry ID is required."
        });
      }

      const { error } = await supabase
        .from("tournament_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: "Entry deleted successfully."
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Entries API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server error."
    });
  }
}
