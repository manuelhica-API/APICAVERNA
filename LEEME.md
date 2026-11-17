# Caverna · cómo publicarla con corrección por IA

Esta carpeta contiene:

- `index.html` → la web completa.
- `netlify/functions/corregir.mjs` → el «intermediario», que guarda la clave de la API y corrige la Explicación.
- `netlify.toml` → le indica a Netlify dónde está cada cosa.

## 1. Clave de la API de Gemini

1. Entra en https://aistudio.google.com con tu cuenta de Google.
2. Pulsa **Get API key → Create API key** y cópiala. Guárdala bien.
3. Si activas la facturación para quitar los límites del nivel gratuito, pon un **presupuesto con alerta** en Google Cloud (Facturación → Presupuestos y alertas).

La corrección usa por defecto el modelo `gemini-2.5-flash`. Si quieres otro, añade en Netlify la variable `MODELO` con su nombre.

## 2. Subir la carpeta a GitHub

Netlify solo activa las funciones si la web se publica desde GitHub o desde su programa de terminal. Si arrastras la carpeta a Netlify Drop, puede que el intermediario no funcione.

1. Crea una cuenta en https://github.com.
2. Pulsa **New repository**, ponle de nombre `caverna` y créalo.
3. Pulsa **uploading an existing file** y arrastra **todo el contenido de esta carpeta**, incluida la carpeta `netlify`.
4. Pulsa **Commit changes**.

## 3. Publicar en Netlify

1. Crea una cuenta en https://app.netlify.com. Puedes entrar con tu cuenta de GitHub.
2. Pulsa **Add new project → Import an existing project → GitHub** y elige `caverna`.
3. Deja la configuración tal cual y pulsa **Deploy**.
4. Ve a **Project configuration → Environment variables** y añade:
   - `GEMINI_API_KEY` = tu clave de Google AI Studio (obligatoria).
   - `CODIGO_CLASE` = un código para tus alumnos, por ejemplo `caverna2026` (opcional, pero muy recomendable si la web es pública).
5. Ve a **Deploys → Trigger deploy → Deploy project** para que se apliquen las variables.
6. En **Domain management** puedes cambiar el nombre, por ejemplo `caverna-filosofia.netlify.app`.

## 4. Probarla

Entra en Platón → Practicar, rellena la Explicación (mínimo 25 palabras) y pulsa **Corregir**. Si pusiste `CODIGO_CLASE`, la web pedirá el código una vez y lo recordará en ese dispositivo.

## Actualizaciones

Cuando cambie la web, sube el nuevo `index.html` a GitHub (Add file → Upload files) y Netlify la vuelve a publicar sola en un minuto.

## Notas

- La clave nunca aparece en la página: solo la conoce Netlify.
- Las respuestas del alumno tienen un límite de longitud para contener el coste.
- El baremo de corrección (2,5 puntos: 0,75 idea principal, 0,25 secundarias y 1,5 explicación) está en `netlify/functions/corregir.mjs`, en el bloque `SISTEMA`. Puedes retocarlo ahí.
- Pide a los alumnos que no escriban datos personales en las respuestas.
