// Caverna · clase opcional y panel del profesor, con inicio de sesión con Google (cuenta del centro).
// El alumno entra con su cuenta @g.educaand.es; el servidor comprueba el token con Google,
// identifica al alumno por su correo (guardado como hash) y devuelve una sesión firmada.
// Variables de entorno:
//   SESION_SECRET   (obligatoria, secreta) texto aleatorio largo para firmar las sesiones
//   PROFE_CLAVE     (obligatoria)          contraseña del panel del profesor (#profe)
//   CODIGO_CLASE    (recomendada)          código que el alumno introduce para unirse
//   GOOGLE_CLIENT_ID (opcional)            por defecto, el ID de cliente de Caverna
//   DOMINIO_CLASE   (opcional)             por defecto g.educaand.es
//   GRUPOS          (opcional)             grupos separados por comas

const GOOGLE_CLIENT_ID_DEF = "74349875926-s1bbftpv8lh1ufpq3nsp5t7iteg2o3rf.apps.googleusercontent.com";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const limpia = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const idOk = (s) => typeof s === "string" && /^[\w-]{8,64}$/.test(s);
const num = (x) => (typeof x === "number" && isFinite(x) ? Math.max(0, Math.min(1, x)) : null);
const COPIA_MAX_CHARS = 4000000;

const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function sha256hex(texto) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}
async function firmar(texto, secreto) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto)));
}

// Comprueba el token de Google y devuelve el correo, o null si no es válido o no es del centro.
async function correoDeGoogle(idtoken, env) {
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idtoken));
  if (!r.ok) return null;
  const t = await r.json();
  const dominio = (env.DOMINIO_CLASE || "g.educaand.es").toLowerCase();
  const correo = String(t.email || "").toLowerCase();
  const valido =
    t.aud === (env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_DEF) &&
    ["accounts.google.com", "https://accounts.google.com"].includes(t.iss) &&
    (t.email_verified === true || t.email_verified === "true") &&
    correo.endsWith("@" + dominio) &&
    Number(t.exp) * 1000 > Date.now();
  return valido ? correo : null;
}

// Devuelve { id, sesion } si la petición trae una sesión válida o un token de Google válido; si no, null.
async function identificar(b, env) {
  if (!env.SESION_SECRET) return null;
  if (typeof b.sesion === "string") {
    const [id, firma] = b.sesion.split(".");
    if (idOk(id) && firma && firma === (await firmar(id, env.SESION_SECRET))) return { id, sesion: b.sesion };
    return null;
  }
  if (typeof b.idtoken === "string") {
    const correo = await correoDeGoogle(b.idtoken, env);
    if (!correo) return null;
    const id = await sha256hex(correo);
    return { id, sesion: id + "." + (await firmar(id, env.SESION_SECRET)) };
  }
  return null;
}

function progresoLimpio(p) {
  if (!p || typeof p !== "object") return null;
  const au = {};
  for (const [k, v] of Object.entries(p.au || {}).slice(0, 8)) {
    if (!/^[a-z]{3,12}$/.test(k) || !v) continue;
    au[k] = { v: num(v.v), te: typeof v.te === "number" ? Math.max(0, Math.min(10, v.te)) : null };
  }
  return {
    t: num(p.t), th: num(p.th), tx: num(p.tx), te: num(p.te), ds: num(p.ds),
    via: ["a", "b", "both"].includes(p.via) ? p.via : "a",
    st: Number.isInteger(p.st) ? Math.max(0, Math.min(20, p.st)) : 0,
    rc: Number.isInteger(p.rc) ? Math.max(0, Math.min(999, p.rc)) : 0,
    rcm: Number.isInteger(p.rcm) ? Math.max(0, Math.min(999, p.rcm)) : 0,
    ins: Number.isInteger(p.ins) ? Math.max(0, Math.min(50, p.ins)) : 0,
    pr: Array.isArray(p.pr) ? p.pr.filter((x) => typeof x === "string" && /^[a-z0-9-]{2,20}$/.test(x)).slice(0, 10) : [],
    au,
  };
}

// Copia del progreso: un objeto clave→texto (cada valor es el JSON que la web guarda en el navegador).
function copiaLimpia(c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const out = {};
  let total = 0;
  for (const [k, v] of Object.entries(c).slice(0, 80)) {
    if (!/^[\w-]{1,40}$/.test(k) || typeof v !== "string") continue;
    total += v.length;
    if (total > COPIA_MAX_CHARS) break;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

const NO_SESION = "Inicia sesión con tu cuenta del centro";

export async function clase(req, env, store) {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: "Petición no válida" }); }
  const codigoClase = env.CODIGO_CLASE || "";
  const grupos = (env.GRUPOS || "2º Bach A").split(",").map((g) => limpia(g, 12)).filter(Boolean);
  const codigoOk = () => !codigoClase || b.codigo === codigoClase;

  if (b.action === "grupos") return json(200, { ok: true, grupos });

  if (b.action === "sync") {
    if (!codigoOk()) return json(403, { error: "Código de clase incorrecto" });
    const yo = await identificar(b, env);
    if (!yo) return json(401, { error: NO_SESION });
    const alias = limpia(b.alias, 24), grupo = limpia(b.grupo, 12), progreso = progresoLimpio(b.progreso);
    if (!alias || !grupo || !progreso) return json(400, { error: "Faltan datos" });
    if (grupos.length && !grupos.includes(grupo)) return json(400, { error: "Ese grupo no existe" });
    const previo = await store.get(yo.id);
    // Si el dispositivo no tiene copia (está vacío), se conserva la que ya había en el servidor.
    const copia = copiaLimpia(b.copia) || (previo && previo.copia) || null;
    const rec = { id: yo.id, alias, grupo, progreso, updated: Date.now() };
    if (copia) rec.copia = copia;
    await store.set(yo.id, rec);
    return json(200, { ok: true, id: yo.id, sesion: yo.sesion });
  }

  if (b.action === "restaurar") {
    if (!codigoOk()) return json(403, { error: "Código de clase incorrecto" });
    const yo = await identificar(b, env);
    if (!yo) return json(401, { error: NO_SESION });
    const rec = await store.get(yo.id);
    return json(200, { ok: true, id: yo.id, sesion: yo.sesion, copia: rec && rec.copia ? rec.copia : null });
  }

  if (b.action === "salir") {
    if (codigoClase && b.codigo !== codigoClase) return json(403, { error: "Código de clase incorrecto" });
    const yo = await identificar(b, env);
    if (!yo) return json(401, { error: NO_SESION });
    await store.del(yo.id);
    return json(200, { ok: true });
  }

  if (b.action === "panel") {
    const clave = env.PROFE_CLAVE || "";
    if (!clave || b.clave !== clave) return json(403, { error: "Contraseña incorrecta" });
    const alumnos = (await store.all())
      .filter((x) => x && x.progreso)
      .map(({ copia, ...resto }) => resto);
    return json(200, { ok: true, alumnos });
  }

  return json(400, { error: "Acción desconocida" });
}
