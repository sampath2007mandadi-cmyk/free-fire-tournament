import { db, hashPassword, json, readBody, requireAdmin } from "../../lib/server.mjs";

export default async function handler(req, res) {
  if (req.method !== "PUT") return json(res, { success: false, error: "Method not allowed." }, 405);
  if (!requireAdmin(req, res)) return;

  try {
    const { currentPassword, newPassword } = await readBody(req);
    if (!currentPassword || !newPassword) {
      return json(res, { success: false, error: "Current and new passwords are required." }, 400);
    }
    if (String(newPassword).length < 8) {
      return json(res, { success: false, error: "New password must be at least 8 characters." }, 400);
    }

    const rows = await db("admin_settings?id=eq.1&select=id,password_hash");
    if (!rows.length) return json(res, { success: false, error: "Admin account is not configured." }, 500);
    if (hashPassword(currentPassword) !== rows[0].password_hash) {
      return json(res, { success: false, error: "Current password is incorrect." }, 401);
    }

    await db("admin_settings?id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() })
    });

    return json(res, { success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error(error);
    return json(res, { success: false, error: error.message || "Password change failed." }, error.status || 500);
  }
}
