import { supabase } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    // GET — public leaderboard
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_points", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        leaderboard: data || []
      });
    }

    // POST — create a leaderboard record
    if (req.method === "POST") {
      const {
        team_id,
        team_name,
        played,
        kills,
        total_points
      } = req.body || {};

      if (!team_name) {
        return res.status(400).json({
          success: false,
          error: "Team name is required."
        });
      }

      const { data, error } = await supabase
        .from("leaderboard")
        .insert([
          {
            team_id: team_id || null,
            team_name,
            played: Number(played) || 0,
            kills: Number(kills) || 0,
            total_points: Number(total_points) || 0
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        leaderboard: data
      });
    }

    // PUT — admin edits leaderboard
    if (req.method === "PUT") {
      const {
        id,
        team_name,
        played,
        kills,
        total_points
      } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Leaderboard record ID is required."
        });
      }

      const updates = {};

      if (team_name !== undefined) {
        updates.team_name = team_name;
      }

      if (played !== undefined) {
        updates.played = Number(played) || 0;
      }

      if (kills !== undefined) {
        updates.kills = Number(kills) || 0;
      }

      if (total_points !== undefined) {
        updates.total_points = Number(total_points) || 0;
      }

      const { data, error } = await supabase
        .from("leaderboard")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        leaderboard: data
      });
    }

    // DELETE — admin removes leaderboard record
    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Leaderboard record ID is required."
        });
      }

      const { error } = await supabase
        .from("leaderboard")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: "Leaderboard record deleted successfully."
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Leaderboard API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server error."
    });
  }
}
