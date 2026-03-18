# 🖥️ Terminal Guide - Creative Engine

The Terminal is an advanced tool that allows you to interact with the engine using text commands. It is ideal for quickly managing files or manipulating scene objects without using the mouse.

---

## 🚀 How to Activate the Terminal

There are two ways to open the terminal in the editor:
1. **Top Menu:** Go to **Window > Terminal**.
2. **Bottom Tab:** In the Assets/Console panel, click on the **Terminal** tab.

---

## 📂 1. File System Commands

These commands allow you to navigate through your project folders:

- `ls`: List all files and folders in the current directory.
- `cd <folder>`: Enter a folder. Use `cd ..` to go up a level or `cd ~` to return to the root.
- `pwd`: Shows the current path you are in.
- `cat <file>`: Displays the content of a text file or script on the screen.
- `clear`: Clears all terminal history.

---

## 🎬 2. Scene Commands (Object Manipulation)

You can create and modify objects (Matters) directly from here:

- `lsobj`: Shows a list of all objects in the current scene with their IDs.
- `mkobj <name>`: Creates a new empty Matter with the indicated name.
- `rmobj <id>`: Deletes the object with the specified ID.
- `inspect <id>`: Shows technical details, components, and properties of the object.
- `addcomp <id> <type>`: Adds a component to the object.
  - *Example:* `addcomp 102 Rigidbody2D`
- `setprop <id> <component> <property> <value>`: Changes the value of a property.
  - *Example:* `setprop 102 Transform position.x 500`
  - *Example:* `setprop 105 SpriteRenderer color #ff0000`

---

## 🌐 3. Utility Commands

- `download <url> [path]`: Downloads a file from the Internet directly to your project.
  - *Example:* `download https://example.com/hero.png Assets/hero.png`
- `help`: Shows the list of all available commands.
- `version`: Shows the current version of Creative Engine.
