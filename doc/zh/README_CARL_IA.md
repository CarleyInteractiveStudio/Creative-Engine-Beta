# 🤖 Carl IA: Your Intelligent Co-pilot - Creative Engine

Carl is the built-in AI assistant designed to help you build games faster. He is not just a chatbot; he is an autonomous agent capable of executing actions within the editor.

---

## 💬 How to Interact with Carl
Click the **Carl** button in the top menu or use `Ctrl + Shift + L`.
You can ask Carl to:
- "Create a player with a Rigidbody2D and a script for movement."
- "Explain how the Animator Controller works."
- "Write a script that makes an object follow the mouse."
- "Download a background image from this URL."

---

## 🛠️ Deep Planning Mode
When you give Carl a complex task, he enters **Deep Planning Mode**:
1. **Questions:** He will ask clarifying questions to be 100% sure of your goals.
2. **The Plan:** He will generate a structured `[PLAN]` with steps like `create_materia`, `add_component`, or `create_file`.
3. **Execution:** You can review the plan in the **Activity** tab.

---

## ⚡ Execution Modes
In **Edit > Preferences**, you can set Carl's autonomy:
- **With Permission (Manual):** You must approve every single step.
- **Visual:** Carl executes steps automatically but shows progress in real-time.
- **Automatic:** Carl works in the background without interruption.

---

## 📜 Scripting Assistance (CHC)
Inside the Code Editor, the **CHC (Code Helper)** allows you to describe logic in natural language, and Carl will translate it into a valid `.ces` script instantly。
- 自动添加 `ve motor;`。
- 为你处理复杂的西班牙语/多语言关键字。
- 使用最新的引擎标准（无前缀的组件访问）。
- 现在还支持手柄命令，如 `mandoBotonPresionado`。

## 🔍 增强的错误检测
Carl 和引擎现在通力合作，帮助你编写代码：
- **实时高亮**：编辑器在你输入时检测错误。
- **自动修复**：Carl 可以分析运行错误并一键建议自动修复。
- **智能控制台**：错误已分类，并允许直接导航到代码。
