// Caverna · clase opcional y panel del profesor
// Guarda solo alias, grupo y porcentajes de progreso (nunca respuestas) en Netlify Blobs.
//   CODIGO_CLASE  (recomendada)  el alumno debe introducirlo para unirse
//   PROFE_CLAVE   (obligatoria)  contraseña del panel del profesor (#profe)

import { getStore } from "@netlify/blobs";

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
    au,
  };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: "Petición no válida" }); }
  const store = getStore("clase");
  const codigoClase = process.env.CODIGO_CLASE || "";

  if (b.action === "sync") {
    if (codigoClase && b.codigo !== codigoClase) return json(403, { error: "Código de clase incorrecto" });
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    const alias = limpia(b.alias, 24), grupo = limpia(b.grupo, 12), progreso = progresoLimpio(b.progreso);
    if (!alias || !grupo || !progreso) return json(400, { error: "Faltan datos" });
    await store.setJSON(b.id, { id: b.id, alias, grupo, progreso, updated: Date.now() });
    return json(200, { ok: true });
  }

  if (b.action === "salir") {
    if (codigoClase && b.codigo !== codigoClase) return json(403, { error: "Código de clase incorrecto" });
    if (!idOk(b.id)) return json(400, { error: "Identificador no válido" });
    await store.delete(b.id);
    return json(200, { ok: true });
  }

  if (b.action === "panel") {
    const clave = process.env.PROFE_CLAVE || "";
    if (!clave || b.clave !== clave) return json(403, { error: "Contraseña incorrecta" });
    const { blobs } = await store.list();
    const alumnos = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    return json(200, { ok: true, alumnos });
  }

  return json(400, { error: "Acción desconocida" });
};
