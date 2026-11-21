// Cloudflare Pages: /api/clase (el código está en servidor/clase.mjs). Datos en Cloudflare KV, enlazado como CLASE.
import { clase } from "../../servidor/clase.mjs";
export const onRequest = ({ request, env }) => {
  if (!env.CLASE) return new Response(JSON.stringify({ error: "Falta enlazar el espacio KV «CLASE» en Cloudflare" }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
  const kv = env.CLASE;
  const store = {
    get: (id) => kv.get(id, { type: "json" }),
    set: (id, obj) => kv.put(id, JSON.stringify(obj)),
    del: (id) => kv.delete(id),
    all: async () => {
      const keys = []; let cursor;
      do { const r = await kv.list({ cursor }); keys.push(...r.keys.map((k) => k.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
      return Promise.all(keys.map((k) => kv.get(k, { type: "json" })));
    },
  };
  return clase(request, env, store);
};
