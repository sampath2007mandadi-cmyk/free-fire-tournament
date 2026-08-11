import crypto from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY.");
}

export async function db(path, options = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Database error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

export function json(res, data, status = 200) {
  res
    .status(status)
    .setHeader("Content-Type", "application/json")
    .setHeader("Cache-Control", "no-store")
    .send(JSON.stringify(data));
}

export function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function b64(value) {
  return Buffer.from(value).toString("base64url");
}

function fromB64(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SESSION_SECRET.");

  const body = b64(JSON.stringify({
    sub: "admin",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  }));

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyToken(token) {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !token) return false;

    const [body, signature] = token.split(".");
    if (!body || !signature) return false;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    const payload = JSON.parse(fromB64(body));
    return payload.sub === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req, res) {
  const header = String(req.headers.authorization || "");
  const token = header.replace(/^Bearer\s+/i, "");

  if (!verifyToken(token)) {
    json(res, { error: "Unauthorized" }, 401);
    return false;
  }

  return true;
}
