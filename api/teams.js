import { supabase } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        teams: data || []
      });
    }

    if (req.method === "POST") {
      const {
        team_name,
        captain_name,
        captain_phone,
        player1,
        player2,
        player3,
        player4
      } = req.body || {};

      if (!team_name || !captain_name || !captain_phone) {
        return res.status(400).json({
          success: false,
          error: "Team name, captain name and phone number are required."
        });
      }

      const { data, error } = await supabase
        .from("teams")
        .insert([
          {
            team_name,
            captain_name,
            captain_phone,
            player1: player1 || "",
            player2: player2 || "",
            player3: player3 || "",
            player4: player4 || ""
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        team: data
      });
    }

    if (req.method === "PUT") {
      const { id, ...updates } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Team ID is required."
        });
      }

      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        team: data
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Team ID is required."
        });
      }

      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: "Team deleted successfully."
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Teams API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server error."
    });
  }
}
