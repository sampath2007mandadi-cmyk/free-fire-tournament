import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase environment variables.");

export async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) { const e = new Error(data?.message || data?.error || `Supabase error ${response.status}`); e.status = response.status; throw e; }
  return data;
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => raw += c);
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Object.assign(new Error("Invalid JSON"), { status: 400 })); } });
    req.on("error", reject);
  });
}

export function json(res, data, status = 200) {
  res.status(status).setHeader("Content-Type", "application/json").setHeader("Cache-Control", "no-store").send(JSON.stringify(data));
}

export function hashPassword(password) { return crypto.createHash("sha256").update(String(password)).digest("hex"); }
export function verifyPassword(password, hash) { return hashPassword(password) === String(hash); }

export function createAdminToken() {
  if (!SESSION_SECRET) throw new Error("Missing ADMIN_SESSION_SECRET.");
  const payload = Buffer.from(JSON.stringify({ sub: "admin", exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token) {
  try {
    if (!SESSION_SECRET || !token) return false;
    const [payload, signature] = String(token).split(".");
    if (!payload || !signature) return false;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.sub === "admin" && data.exp > Date.now();
  } catch { return false; }
}

export function requireAdmin(req, res) {
  const header = String(req.headers.authorization || "");
  const token = header.replace(/^Bearer\s+/i, "");
  if (!verifyAdminToken(token)) { json(res, { success: false, error: "Admin authentication required." }, 401); return false; }
  return true;
}
