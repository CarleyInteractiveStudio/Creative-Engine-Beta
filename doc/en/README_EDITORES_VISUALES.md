# 🎨 Visual Editors Guide - Creative Engine

Creative Engine includes specialized tools for asset creation and world-building without code.

---

## 🎭 1. Animator Controller (.ceanim)
Manage your characters' state logic.
- **States:** Nodes containing an animation clip (.cea).
- **Transitions:** Arrows connecting states under certain conditions.
- **Smart Mode:** Automatically chooses states based on movement.

---

## 🦴 2. Skeletal Animation and Skinning
Move parts of an object fluidly.
- **Bone:** Defines the hierarchical structure.
- **SkeletonRenderer:** Deforms an image according to bone movement.
- **IK (Inverse Kinematics):** Automatically adjusts limbs (like a leg) when moving the end effector (a foot).

---

## ⛰️ 5. 2D Terrain Editor
Paint organic floor and wall shapes with custom textures.
- **Collisions:** The **TerrenoCollider2D** component automatically generates the physical shape.

---

## 🎞️ 6. VidSpri: Video to Sprite Converter
Integrated tool to convert video files into optimized sprite sheets or image sequences. Access from **Window > Vid Spri**.
