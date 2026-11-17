// Caverna · corrección con Gemini de la Cuestión 1.ª (idea principal, ideas secundarias y explicación)
// Basado en el baremo de Manuel (2,5 puntos). La clave vive en Netlify, nunca en la página.
//   GEMINI_API_KEY  (obligatoria)  clave de Google AI Studio
//   CODIGO_CLASE    (opcional)     si existe, el alumno debe introducir este código
//   MODELO          (opcional)     por defecto gemini-2.5-flash

const LIM = { texto: 4000, principal: 800, secundaria: 1500, explicacion: 4000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const SISTEMA = `Eres un profesor catedrático de Historia de la Filosofía de 2.º de Bachillerato evaluando la Cuestión 1.ª del comentario de texto PAU.
Evalúa los tres apartados aplicando estrictamente este baremo sobre 2,5 puntos (usa múltiplos de 0,05):

1. IDEA PRINCIPAL (0 a 0,75 puntos):
   - Debe enunciar con precisión, claridad y palabras propias la tesis filosófica central que el autor sostiene en el fragmento.
   - Penaliza si confunde el "tema" general (un sintagma nominal) con la "tesis" concreta, si copia frases literales sin sintetizar o si comete imprecisiones conceptuales graves.

2. IDEAS SECUNDARIAS (0 a 0,25 puntos):
   - Debe identificar con precisión los argumentos de apoyo, distinciones conceptuales, niveles argumentativos o metáforas/ejemplos del fragmento que sostienen o complementan la tesis principal (ej. los tres niveles de duda en Descartes, la crítica al racionalismo y relativismo en Ortega, o el nihilismo y la nueva aurora en Nietzsche).

3. EXPLICACIÓN (0 a 1,5 puntos):
   - Debe desarrollar de forma argumentada y coherente tanto la idea principal como las secundarias, vinculándolas entre sí y utilizando el vocabulario técnico propio del autor.
   - ESTÁNDAR DE EXCELENCIA (1,25 - 1,5 puntos):
     * Traduce las expresiones o metáforas del fragmento a categorías filosóficas rigurosas (ej. "lo igual en sí" -> dualismo ontológico y reminiscencia; "se hubiera puesto algún sol" -> Idea de Bien platónica; "el paisaje" -> perspectivismo frente a racionalismo y relativismo).
     * Explica a fondo los conceptos filosóficos clave del fragmento y las nociones doctrinales aledañas directamente conectadas con la tesis.
     * Integra al menos 2 citas textuales breves del fragmento (con referencia a líneas o expresiones) seguidas de su explicación conceptual.
   - PENALIZACIONES ESPECÍFICAS:
     * Mencionar sin explicar: Si solo nombra de pasada un concepto clave al final (ej. citar "dialéctica" o "reminiscencia" sin explicar en qué consiste), sitúa la nota en torno a 0,85 - 1,05 y pídele que desarrolle ese concepto.
     * Parafraseo o citas sueltas: Si repite el texto con otras palabras o deja citas entrecomilladas sin explicarlas filosóficamente, reduce la puntuación.
     * Imprecisión doctrinal: Señala errores entre planos (ej. confundir la Idea del Bien con el acto de conocer).
     * Exceso de teoría externa (invadir la Cuestión 2.ª): No se debe recitar toda la filosofía del autor; penaliza si suelta teoría memorizada que no guarda relación directa con el fragmento.

Dirígete al alumno de tú, en español de España, con un tono exigente pero amable. No inventes contenido que no esté en el fragmento.`;

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    puntuacion_apartados: {
      type: "OBJECT",
      properties: {
        idea_principal: { type: "NUMBER", description: "De 0 a 0,75 puntos" },
        ideas_secundarias: { type: "NUMBER", description: "De 0 a 0,25 puntos" },
        explicacion: { type: "NUMBER", description: "De 0 a 1,5 puntos" },
      },
      required: ["idea_principal", "ideas_secundarias", "explicacion"],
    },
    coherencia_interna: { type: "BOOLEAN", description: "True si la explicación desarrolla de forma coherente la idea principal y las secundarias enunciadas por el alumno" },
    citas_bien_explicadas: { type: "BOOLEAN", description: "True si incluye citas breves del texto y las explica filosóficamente sin caer en paráfrasis" },
    errores_detectados: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Etiquetas breves de fallos si los hay (ej. 'Menciona concepto sin explicarlo', 'Parafraseo literal', 'Citas sin explicar', 'Imprecisión conceptual', 'Teoría fuera de texto (Cuestión 2.ª)')",
    },
    feedback_por_apartado: {
      type: "OBJECT",
      properties: {
        idea_principal: { type: "STRING", description: "Valoración breve y consejo de mejora para la idea principal" },
        ideas_secundarias: { type: "STRING", description: "Valoración breve sobre la detección de ideas secundarias" },
        explicacion: { type: "STRING", description: "Valoración detallada: qué conceptos clave y nociones aledañas ha explicado bien, cómo ha usado las citas y qué debe ampliar" },
      },
      required: ["idea_principal", "ideas_secundarias", "explicacion"],
    },
    solucion_modelo_sugerida: {
      type: "OBJECT",
      properties: {
        idea_principal: { type: "STRING" },
        ideas_secundarias: { type: "STRING" },
        explicacion: { type: "STRING", description: "Explicación modelo rigurosa con citas breves entrecomilladas y traducción conceptual" },
      },
      required: ["idea_principal", "ideas_secundarias", "explicacion"],
    },
  },
  required: ["puntuacion_apartados", "coherencia_interna", "citas_bien_explicadas", "errores_detectados", "feedback_por_apartado", "solucion_modelo_sugerida"],
};

// Ajusta al rango y redondea a múltiplos de 0,05
const pts = (x, max) => Math.round(Math.max(0, Math.min(max, Number(x) || 0)) * 20) / 20;

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });

  let d;
  try { d = await req.json(); } catch { return json(400, { error: "Petición no válida" }); }

  const codigo = process.env.CODIGO_CLASE;
  if (codigo && String(d.codigo || "").trim() !== codigo) return json(401, { error: "Código de clase incorrecto" });

  const cut = (x, n) => String(x || "").slice(0, n).trim();
  const texto = cut(d.texto, LIM.texto);
  const principal = cut(d.principal, LIM.principal);
  const secundaria = cut(d.secundaria, LIM.secundaria);
  const explicacion = cut(d.explicacion, LIM.explicacion);
  if (!texto || !explicacion) return json(400, { error: "Faltan el fragmento o la explicación del alumno" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: "Falta GEMINI_API_KEY en Netlify" });

  const prompt = `Corrige el siguiente análisis de texto de Historia de la Filosofía (2.º de Bachillerato / PAU).
Puntuación máxima total de este bloque: 2,5 puntos.

DATOS DEL FRAGMENTO:
- Autor: ${cut(d.autor, 80) || "No especificado"}
- Obra: ${cut(d.referencia, 160) || "No especificada"}
- Texto original:
"""${texto}"""

SOLUCIÓN MODELO DEL DOCENTE (ÚSALA COMO ANCLA PRINCIPAL DE CALIBRACIÓN):
- Idea principal modelo: ${cut(d.ref_principal, 800) || "No especificada"}
- Ideas secundarias modelo: ${cut(d.ref_secundaria, 1500) || "No especificadas"}
- Conexión con la teoría: ${cut(d.conexion, 400) || "No especificada"}

RESPUESTAS DEL ALUMNO:
1. Idea principal: """${principal || "(En blanco)"}"""
2. Ideas secundarias: """${secundaria || "(En blanco)"}"""
3. Explicación (idea principal y secundarias): """${explicacion}"""`;

  // Modelos a probar en orden: si uno está saturado (503/429) o no existe (404), se pasa al siguiente.
  const modelos = [...new Set([process.env.MODELO || "gemini-3.8-flash", "gemini-3.5-flash-lite"])];
  const cuerpo = JSON.stringify({
    systemInstruction: { parts: [{ text: SISTEMA }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.15, responseMimeType: "application/json", responseSchema: ESQUEMA,
      thinkingConfig: { thinkingLevel: "low" },
    },
  });
  const inicio = Date.now();
  try {
    let r = null, saturado = false;
    for (const [i, modelo] of modelos.entries()) {
      const restante = 25000 - (Date.now() - inicio);
      if (restante < 4000) break;
      // El primer modelo tiene como máximo 15 s; así siempre queda tiempo para el de respaldo.
      const tope = i < modelos.length - 1 ? Math.min(15000, restante - 8000) : restante;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: cuerpo,
          signal: AbortSignal.timeout(tope),
        });
      } catch (e) {
        console.error("Gemini", modelo, "sin respuesta:", e.name);
        r = null; saturado = true; continue;
      }
      if (r.ok) break;
      const st = r.status;
      if (st === 400) {
        const t = await r.text();
        console.error("Gemini", modelo, 400, t);
        if (/thinking/i.test(t)) {
          const sinThinking = JSON.parse(cuerpo); delete sinThinking.generationConfig.thinkingConfig;
          r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
            method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify(sinThinking), signal: AbortSignal.timeout(Math.max(3000, 25000 - (Date.now() - inicio))),
          }).catch(() => null);
          if (r && r.ok) break;
        }
        r = null; continue;
      }
      console.error("Gemini", modelo, st, await r.text());
      if ([404, 429, 500, 503].includes(st)) { saturado = saturado || st !== 404; r = null; continue; }
      return json(502, { error: "La IA no ha podido corregir ahora mismo" });
    }
    if (!r) return json(503, { error: "saturada", saturada: saturado });
    const out = await r.json();
    const txt = (out.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const ev = JSON.parse(txt);

    const p = ev.puntuacion_apartados || {};
    const ip = pts(p.idea_principal, 0.75), is = pts(p.ideas_secundarias, 0.25), ex = pts(p.explicacion, 1.5);
    const f = ev.feedback_por_apartado || {};
    const s = ev.solucion_modelo_sugerida || {};
    return json(200, {
      nota_total: Math.round((ip + is + ex) * 100) / 100,
      puntuacion_apartados: { idea_principal: ip, ideas_secundarias: is, explicacion: ex },
      coherencia_interna: !!ev.coherencia_interna,
      citas_bien_explicadas: !!ev.citas_bien_explicadas,
      errores_detectados: (ev.errores_detectados || []).slice(0, 6).map(String),
      feedback_por_apartado: {
        idea_principal: String(f.idea_principal || ""),
        ideas_secundarias: String(f.ideas_secundarias || ""),
        explicacion: String(f.explicacion || ""),
      },
      solucion_modelo_sugerida: {
        idea_principal: String(s.idea_principal || ""),
        ideas_secundarias: String(s.ideas_secundarias || ""),
        explicacion: String(s.explicacion || ""),
      },
    });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Error interno al evaluar el comentario" });
  }
};
