# 🧩 组件指南 (法律) - Creative Engine

在 Creative Engine 中，**物质** (对象) 通过 **法律** (组件) 获得生命。每条法律都添加了特定的功能，如重力、图像渲染或 AI 逻辑。

---

## 🏗️ 1. 核心组件

### 📍 Transform (变换) / UITransform
定义对象在 2D 空间中的位置、旋转和缩放。
- **脚本编写：**
  ```ces
  posicion.x += 5; // 向右移动
  rotacion += 45;  // 旋转 45 度
  escala.x = 2;    // 水平尺寸翻倍
  ```

### 🎥 Camera (摄像机)
定义游戏的可见区域。

---

## ⚙️ 3. 2D 物理

### ⚖️ Rigidbody2D (物理)
允许对象对重力和碰撞做出反应。
- **脚本编写：**
  ```ces
  fisica.applyImpulse(nuevo Vector2(0, -10)); // 跳跃
  fisica.gravityScale = 0; // 禁用重力
  ```

---

## ⚔️ 8. 战斗与机制

### ❤️ Health (生命值)
管理对象的健康状况及其死亡时的销毁或动画。
- **脚本编写：**
  ```ces
  salud.currentHealth -= 10; // 受到伤害
  ```

### ⚔️ Attack (攻击)
允许配置具有不同按键、动画和伤害的多次攻击。
