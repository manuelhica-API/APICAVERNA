// Caverna · clase opcional y panel del profesor
// Guarda alias, grupo, porcentajes de progreso y una copia del progreso del alumno (para recuperarlo en otro dispositivo).
// El panel del profesor solo muestra alias y porcentajes; nunca la copia.
// Variables de entorno:
//   CODIGO_CLASE   (recomendada)  el alumno debe introducirlo para unirse
//   PROFE_CLAVE    (obligatoria)  contraseña del panel del profesor (#profe)
//   GRUPOS         (opcional)     grupos separados por comas, p. ej. «2º A, 2º B»; si no existe se usa «2º Bach A»

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const limpia = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const idOk = (s) => typeof s === "string" && /^[\w-]{8,64}$/.test(s);
const num = (x) => (typeof x === "number" && isFinite(x) ? Math.max(0, Math.min(1, x)) : null);
const COPIA_MAX_CHARS = 4000000;

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
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    const alias = limpia(b.alias, 24), grupo = limpia(b.grupo, 12), progreso = progresoLimpio(b.progreso);
    if (!alias || !grupo || !progreso) return json(400, { error: "Faltan datos" });
    if (grupos.length && !grupos.includes(grupo)) return json(400, { error: "Ese grupo no existe" });
    const previo = await store.get(b.id);
    // Si el dispositivo no tiene copia (está vacío), se conserva la que ya había en el servidor.
    const copia = copiaLimpia(b.copia) || (previo && previo.copia) || null;
    const rec = { id: b.id, alias, grupo, progreso, updated: Date.now() };
    if (copia) rec.copia = copia;
    await store.set(b.id, rec);
    return json(200, { ok: true });
  }

  if (b.action === "restaurar") {
    if (!codigoOk()) return json(403, { error: "Código de clase incorrecto" });
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    const rec = await store.get(b.id);
    return json(200, { ok: true, copia: rec && rec.copia ? rec.copia : null });
  }

  if (b.action === "salir") {
    if (codigoClase && b.codigo !== codigoClase) return json(403, { error: "Código de clase incorrecto" });
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    await store.del(b.id);
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
