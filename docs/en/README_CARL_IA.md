# 🤖 Guide to Carl AI: Your Autonomous Assistant - Creative Engine

Carl AI is not just a chat; it is an intelligent agent capable of manipulating the editor, creating files, and helping you build your game step by step.

---

## 🚀 How to Activate Carl AI

To open Carl's panel:
1. **Top Button:** Click on the robot icon 🤖 (**Carl**) in the menu bar.
2. **Shortcut:** Press `Shift + Ctrl + L`.

---

## ⚙️ Settings (API Keys)

Carl needs a "brain" to function. You must configure an API key in **Edit > Preferences > AI**.

### Where to find API Keys?
- **Google Gemini (Recommended/Free):** Go to [Google AI Studio](https://aistudio.google.com/app/apikey). Create a free key for Gemini 1.5 Flash.
- **OpenAI (GPT):** Go to [OpenAI Platform](https://platform.openai.com/api-keys). Requires balance in your account.
- **Anthropic (Claude):** Go to [Anthropic Console](https://console.anthropic.com/settings/keys).

**Instructions:** Select the provider in Preferences, paste the key and click **Save Key**. Then choose a model from the list.

---

## 🛠️ Autonomous Abilities

You can ask Carl to perform real tasks in your project. Examples of what you can say:

- *"Create an object called Player with a SpriteRenderer and Rigidbody2D."*
- *"Download a background from this URL and put it in my scene."*
- *"Create a script that moves the player with the arrows."*
- *"Change the color of all my enemies to red."*

### The "Activity" Tab
When Carl proposes an action (e.g., creating an object), it will generate an **Action Plan**.
1. Click the **"View Activity"** button that appears in the chat.
2. You will see the detailed steps Carl is going to execute.
3. Depending on your **Execution Mode**, Carl will ask for permission or do it alone.

---

## 🚦 Execution Modes

You can change Carl's behavior from the dropdown in its panel:

1. **With Permission (Safe):** Carl will show you each step and you must click "Approve" for it to continue.
2. **Visual (Recommended):** Carl executes the commands automatically but with a pause between them so you can see the progress in the scene.
3. **Automatic (Fast):** Carl performs the entire plan instantly.
