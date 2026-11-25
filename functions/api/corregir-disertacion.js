// Cloudflare Pages: /api/corregir-disertacion (la lógica está en servidor/corregir-disertacion.mjs)
import { corregirDisertacion } from "../../servidor/corregir-disertacion.mjs";

export const onRequest = async ({ request, env }) => {
  try {
    return await corregirDisertacion(request, env);
  } catch (e) {
    const mensaje = e && e.message ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Error interno del servidor: " + mensaje }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
};
