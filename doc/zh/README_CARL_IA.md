# 🤖 Carl IA: Your Intelligent Co-pilot - Creative Engine

Carl is more than just a chat; he is an autonomous agent integrated into the engine, capable of helping you build your game by performing real actions.

---

## 💬 How to interact with Carl
Click the **Carl** button in the top menu or use `Ctrl + Shift + L`.
You can ask for:
- "Create a player with physics and a script to move it with arrow keys."
- "Explain how the Water component works."
- "Download a background image from this URL."
- "Make a plan to create an inventory system."

---

## 🧠 Deep Planning Mode
When you request a complex task, Carl enters analysis mode:
1. **Questions:** He will ask clarifying questions to be 100% sure of your goals.
2. **The Plan:** He will generate a structured `[PLAN]` block with executable steps.
3. **Activity:** You can view and approve these steps in the **Activity** tab of his panel.

---

## ⚡ Autonomous Commands
Carl can execute:
- `create_materia`: Create objects (Sprites, Cameras, etc.).
- `add_component`: Add Laws to existing objects.
- `set_property`: Modify values in the Inspector.
- `create_file`: Create scripts (.ces) or data files.
- `download_file`: Import assets from the internet directly to your project.

---

## 🛠️ Code Assistance (CHC)
In the Code Editor, use **CHC (Code Helper)**. Write in human language, and Carl will instantly translate it into valid `.ces` code, following all engine standards (like the mandatory use of `ve motor;`).

---

## ⚙️ Autonomy Settings
In **Edit > Preferences**, you can choose how much freedom Carl has:
- **With Permission:** You must manually approve each step.
- **Visual:** Carl executes on his own, but you see the progress step-by-step.
- **Automatic:** Carl works in the background without interruptions.
