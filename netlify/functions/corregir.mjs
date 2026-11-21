// Netlify: envoltorio de la corrección con Gemini (el código está en servidor/corregir.mjs)
import { corregir } from "../../servidor/corregir.mjs";
export default (req) => corregir(req, process.env);
