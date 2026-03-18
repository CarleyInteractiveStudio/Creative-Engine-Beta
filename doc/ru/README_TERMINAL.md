# 📟 Terminal Guide: Commands and Utilities - Creative Engine

The Creative Engine Terminal is a low-level tool for developers to inspect the engine's internal state and execute advanced operations.

---

## 🚀 1. How to Open the Terminal
Go to **Window > Terminal** or use the shortcut `Ctrl + \` (if assigned). It's also available as a tab in the Code Editor view.

---

## 🛠️ 2. Core Commands

### `ls` / `dir`
Lists all files in the current project directory.
- `ls Assets`: Shows contents of the Assets folder.

### `clear` / `cls`
Clears the terminal output screen.

### `whoami`
Displays the current engine version and active project.

### `help`
Lists all available terminal commands.

---

## 🧪 3. Advanced Engine Commands

### `find [name]`
Search for a Materia in the hierarchy by its name.

### `inspect [id]`
Dumps the internal JSON state of a Materia with the given ID.

### `stats`
Displays real-time performance metrics (FPS, Draw Calls, Physics objects).

---

## 🎮 4. Game Control

### `play` / `stop`
Starts or stops the game directly from the command line.

### `scene [path]`
Loads a scene from the given relative path.
- `scene Assets/MainScene.ceScene`

### `set [prop] [value]`
Directly modifies a property on the engine's state.
- `set timeScale 0.5`: Enters slow-motion mode.
- `set debugDraw true`: Shows physics colliders.
