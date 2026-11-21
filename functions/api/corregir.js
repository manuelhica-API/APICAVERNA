// Cloudflare Pages: /api/corregir (el código está en servidor/corregir.mjs)
import { corregir } from "../../servidor/corregir.mjs";
export const onRequest = ({ request, env }) => corregir(request, env);
