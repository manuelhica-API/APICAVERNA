// Cloudflare Pages: /api/corregir-disertacion (la lógica está en servidor/corregir-disertacion.mjs)
import { corregirDisertacion } from "../../servidor/corregir-disertacion.mjs";

export const onRequest = ({ request, env }) => corregirDisertacion(request, env);
