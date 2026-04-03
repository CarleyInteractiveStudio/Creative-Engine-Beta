# ⚙️ Configuration, Preferences, and Environment Guide - Creative Engine

This guide explains how to customize your editor workflow and configure your project's technical parameters.

---

## 🛠️ 1. Project Settings

Access via **Edit > Project Settings**. These changes are saved in the `project.ceconfig` file.

- **Metadata:** Change your game's name, version, and author.
- **Icon:** Select the image that will represent your game when exported.
- **Layers:**
  - **Sorting Layers:** Define the order in which objects are drawn (items lower in the list are drawn in front).
  - **Collision Layers:** Define which layers can collide with each other.
- **Tags:** Create custom labels (e.g., "Enemy", "Spikes") to use in your scripts with `isTouchingTag()`.

---

## 🎨 2. Editor Preferences

Access via **Edit > Preferences**. These settings are personal and do not affect the final game.

- **Language:** Switch the interface between Spanish and English.
- **Themes:** Choose from several visual themes (Dark, Light, Carl, etc.) or create your own.
- **Autosave:** Enable automatic saving of your scripts every few seconds.
- **Snapping:** When enabled, objects will "snap" to the grid when moved. You can define the grid size.
- **Terminal:** Toggle the visibility of the command terminal.

---

## 🌗 3. Environment Control (Atmosphere)

Access via **Window > Environment Control**. Create weather and time cycles in your scene.

- **Color Filter:** Change the general color of the scene. Use it to create sunset, night effects, or color filters (sepia, cold, etc.).
- **Day/Night Cycle:**
  - **Auto Cycle:** If enabled, time will advance automatically during gameplay.
  - **Day Duration:** Define how many seconds it takes to complete a 24-hour cycle.
- **Excluded Layers:** Specify which layers should NOT darken when it is night (very useful for UI or Lights to always stay bright).
