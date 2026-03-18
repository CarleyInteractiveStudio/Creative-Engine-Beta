# 🤖 Guía de Carl IA: Tu Asistente Autónomo - Creative Engine

Carl IA no es solo un chat; es un agente inteligente capaz de manipular el editor, crear archivos y ayudarte a construir tu juego paso a paso.

---

## 🚀 Cómo Activar a Carl IA

Para abrir el panel de Carl:
1. **Botón Superior:** Haz clic en el icono del robot 🤖 (**Carl**) en la barra de menú.
2. **Atajo:** Presiona `Shift + Ctrl + L`.

---

## ⚙️ Configuración (API Keys)

Carl necesita un "cerebro" para funcionar. Debes configurar una clave de API en **Editar > Preferencias > IA**.

### ¿Dónde encontrar las API Keys?
- **Google Gemini (Recomendado/Gratis):** Ve a [Google AI Studio](https://aistudio.google.com/app/apikey). Crea una clave gratuita para Gemini 1.5 Flash.
- **OpenAI (GPT):** Ve a [OpenAI Platform](https://platform.openai.com/api-keys). Requiere saldo en tu cuenta.
- **Anthropic (Claude):** Ve a [Anthropic Console](https://console.anthropic.com/settings/keys).

**Instrucciones:** Selecciona el proveedor en Preferencias, pega la clave y haz clic en **Guardar Clave**. Luego elige un modelo de la lista.

---

## 🛠️ Habilidades Autónomas

Puedes pedirle a Carl que realice tareas reales en tu proyecto. Ejemplos de lo que puedes decir:

- *"Crea un objeto llamado Jugador con un SpriteRenderer y Rigidbody2D."*
- *"Descarga un fondo desde esta URL y ponlo en mi escena."*
- *"Crea un script que mueva al jugador con las flechas."*
- *"Cambia el color de todos mis enemigos a rojo."*

### La Pestaña "Actividad" (Activity)
Cuando Carl propone una acción (ej: crear un objeto), generará un **Plan de Acción**.
1. Haz clic en el botón **"Ver Actividad"** que aparecerá en el chat.
2. Verás los pasos detallados que Carl va a ejecutar.
3. Dependiendo de tu **Modo de Ejecución**, Carl pedirá permiso o lo hará solo.

---

## 🚦 Modos de Ejecución

Puedes cambiar el comportamiento de Carl desde el desplegable en su panel:

1. **Con Permiso (Seguro):** Carl te mostrará cada paso y deberás hacer clic en "Aprobar" para que continúe.
2. **Visual (Recomendado):** Carl ejecuta los comandos automáticamente pero con una pausa entre ellos para que veas el progreso en la escena.
3. **Automático (Rápido):** Carl realiza todo el plan de forma instantánea.

---

## 💡 Consejos para hablar con Carl
- **Sé específico:** *"Crea un cuadrado azul de 100x100"* es mejor que *"Crea algo"*.
- **Usa referencias:** Puedes decirle *"Mueve a @last a la derecha"*, donde `@last` se refiere al último objeto que Carl creó.
- **Pide correcciones:** Si un script tiene un error, pégalo en el chat y dile *"Carl, corrige este error de sintaxis"*.
