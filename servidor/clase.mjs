// Caverna · clase opcional y panel del profesor
// Guarda solo alias, grupo y porcentajes de progreso (nunca respuestas).
// Código común: el almacén lo pone cada plataforma (Netlify Blobs o Cloudflare KV).
//   store: { get(id), set(id, obj), del(id), all() }
//   CODIGO_CLASE  (recomendada)  el alumno debe introducirlo para unirse
//   PROFE_CLAVE   (obligatoria)  contraseña del panel del profesor (#profe)
//   GRUPOS        (opcional)     grupos separados por comas, p. ej. «2º A, 2º B»; el alumno los elige de una lista.
//                                 Si no existe, se usa «2º A».


const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const limpia = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const idOk = (s) => typeof s === "string" && /^[\w-]{8,64}$/.test(s);
const num = (x) => (typeof x === "number" && isFinite(x) ? Math.max(0, Math.min(1, x)) : null);

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

export async function clase(req, env, store) {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: "Petición no válida" }); }
  const codigoClase = env.CODIGO_CLASE || "";
  const grupos = (env.GRUPOS || "2º A").split(",").map((g) => limpia(g, 12)).filter(Boolean);

  if (b.action === "grupos") return json(200, { ok: true, grupos });


  if (b.action === "sync") {
    if (codigoClase && b.codigo !== codigoClase) return json(403, { error: "Código de clase incorrecto" });
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    const alias = limpia(b.alias, 24), grupo = limpia(b.grupo, 12), progreso = progresoLimpio(b.progreso);
    if (!alias || !grupo || !progreso) return json(400, { error: "Faltan datos" });
    if (grupos.length && !grupos.includes(grupo)) return json(400, { error: "Ese grupo no existe" });
    await store.set(b.id, { id: b.id, alias, grupo, progreso, updated: Date.now() });
    return json(200, { ok: true });
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
    const alumnos = (await store.all()).filter(Boolean);
    return json(200, { ok: true, alumnos });
  }

  return json(400, { error: "Acción desconocida" });
}
