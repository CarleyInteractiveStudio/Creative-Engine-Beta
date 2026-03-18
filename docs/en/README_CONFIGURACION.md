# ⚙️ Configuration, Preferences, and Environment Guide - Creative Engine

This guide explains how to customize your workflow in the editor and how to configure the technical parameters of your project.

---

## 🛠️ 1. Project Settings

Access via **Edit > Project Settings**. These changes are saved in the `project.ceconfig` file.

- **Metadata:** Change the name of your game, version, and author.
- **Icon:** Select the image that will represent your game when exported.
- **Layers:**
  - **Sorting Layers:** Defines the order in which objects are drawn (items lower in the list are drawn in front).
  - **Collision Layers:** Defines which layers can collide with each other.
- **Tags:** Create custom tags (e.g., "Enemy", "Spikes") to use in your scripts with `isTouchingTag()`.

---

## 🎨 2. Editor Preferences

Access via **Edit > Preferences**. These settings are personal and do not affect the final game.

- **Language:** Switch the interface between Spanish and English.
- **Themes:** Choose from several visual themes (Dark, Light, Carl, etc.) or create your own.
- **Autosave:** Enable automatic saving of your scripts every few seconds.
- **Snapping:** If enabled, objects will "snap" to the grid when moved. You can define the grid size.
- **Terminal:** Enable or disable the visibility of the command terminal.

---

## 🌗 3. Environment Control (Atmosphere)

Access via **Window > Environment Control**. Allows creating weather and time cycles in your scene.

- **Color Filter:** Changes the overall color of the scene. Use it to create sunset, night effects, or color filters (sepia, cold, etc.).
- **Day/Night Cycle:**
  - **Automatic Cycle:** If enabled, time will advance by itself during the game.
  - **Day Duration:** Defines how many seconds it takes to complete a 24h cycle.
- **Excluded Layers:** Indicates which layers should NOT darken when it is night (very useful so that the User Interface or Lights always look bright).
