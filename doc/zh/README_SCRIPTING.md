# 📜 脚本编写大师指南 (CES) - Creative Engine

Creative Engine 使用 **CES (Creative Engine Script)**，这是一种基于 JavaScript 但为游戏创作者简化的强大语言。本指南将教您从基础到高级系统的所有知识。

---

## 🚀 核心概念

### 1. 强制导入
每个脚本必须以连接引擎的指令开始：
```ces
ve motor;
```

### 2. 直接访问 (无前缀)
与其他引擎不同，您不需要编写 `this.` 或 `mtr.` 来访问对象的组件。如果对象具有 `SpriteRenderer`，只需编写 `renderizadorDeSprite`。

### 3. 多语言设计
您可以互换使用西班牙语或英语术语进行编码。引擎都能理解。例如，`fisica` 与 `rigidbody2D` 相同。

---

## 💎 公共变量 (检查器)
要使变量出现在编辑器的检查器中，请使用 `publico` 关键字。

```ces
publico numero velocidad = 5;
publico texto nombreJugador = "英雄";
publico booleano esInvencible = falso;
publico Materia objetivo; // 将出现一个用于拖放对象的方框
```

---

## 🛠️ 引擎实用程序
- `buscar(nombre)`: 在场景中查找对象。
- `destruir(materia)`: 删除对象。
- `lanzarRayo(origen, direccion, distancia, tag)`: 2D 射线检测。
- `estaTocandoTag(tag)`: 快速碰撞检测。
- `instanciar(original, x, y)`: 克隆现有对象。
- `crear miPrefab`: 按名称实例化预制件。
- `solapamientoUI(mtrA, mtrB)`: 检测界面元素之间的碰撞。
