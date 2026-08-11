import { supabase } from "../../lib/server.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required."
      });
    }

    const { data, error } = await supabase
      .from("admin_settings")
      .select("password_hash")
      .limit(1)
      .single();

    if (error) throw error;

    // Password verification is handled by the server utility.
    const { verifyPassword, createAdminToken } =
      await import("../../lib/server.mjs");

    const valid = await verifyPassword(password, data.password_hash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Incorrect admin password."
      });
    }

    const token = createAdminToken();

    return res.status(200).json({
      success: true,
      token
    });

  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to process admin login."
    });
  }
}
