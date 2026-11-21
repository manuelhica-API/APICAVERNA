// Netlify: envoltorio de la clase opcional (el código está en servidor/clase.mjs). Datos en Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { clase } from "../../servidor/clase.mjs";
export default (req) => {
  const s = getStore("clase");
  const store = {
    get: (id) => s.get(id, { type: "json" }),
    set: (id, obj) => s.setJSON(id, obj),
    del: (id) => s.delete(id),
    all: async () => { const { blobs } = await s.list(); return Promise.all(blobs.map((x) => s.get(x.key, { type: "json" }))); },
  };
  return clase(req, process.env, store);
};
