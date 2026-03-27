# 🤖 Carl IA: Tu Copiloto Inteligente - Creative Engine

Carl no es solo un chat; es un agente autónomo integrado en el motor capaz de ayudarte a construir tu juego realizando acciones reales por ti.

---

## 💬 Cómo interactuar con Carl
Haz clic en el botón **Carl** del menú superior o usa `Ctrl + Shift + L`.
Puedes pedirle cosas como:
- "Crea un jugador con físicas y un script para moverlo con las flechas."
- "Explícame cómo funciona el componente Water."
- "Descarga una imagen de fondo desde esta URL."
- "Haz un plan para crear un sistema de inventario."

---

## 🧠 Modo de Planeación Profunda (Deep Planning)
Cuando le pides una tarea compleja, Carl entra en un modo de análisis:
1. **Preguntas:** Te hará preguntas aclaratorias para estar 100% seguro de tus metas.
2. **El Plan:** Generará un bloque estructurado llamado `[PLAN]` con pasos ejecutables.
3. **Actividad:** Puedes ver y aprobar estos pasos en la pestaña **Actividad** de su panel.

---

## ⚡ Comandos Autónomos
Carl puede ejecutar comandos como:
- `create_materia`: Crea objetos (Sprites, Cámaras, etc.).
- `add_component`: Añade Leyes a objetos existentes.
- `set_property`: Modifica valores en el Inspector.
- `create_file`: Crea scripts (.ces) o archivos de datos.
- `download_file`: Importa activos desde internet directamente a tu proyecto.

---

## 🛠️ Asistencia en Código (CHC)
Dentro del Editor de Código, puedes usar el **CHC (Code Helper)**. Escribe en lenguaje humano lo que quieres que haga tu script, y Carl lo traducirá instantáneamente a código `.ces` válido, siguiendo todos los estándares del motor (como el uso obligatorio de `ve motor;`).

---

## ⚙️ Configuración de Autonomía
En **Editar > Preferencias**, puedes elegir cuánta libertad tiene Carl:
- **Con Permiso:** Debes aprobar cada paso manualmente.
- **Visual:** Carl ejecuta solo pero ves el progreso paso a paso.
- **Automático:** Carl trabaja en segundo plano sin interrupciones.
