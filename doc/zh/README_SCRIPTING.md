# 📜 脚本大师指南 (CES) - Creative Engine

欢迎来到创作的前沿！在 **Creative Engine** 中，脚本不是障碍，而是你的超能力。**CES (Creative Engine Script)** 语言被设计得直观、强大，而且最重要的是，**比你想象的要简单**。

本指南将牵着你的手，从你的第一个“Hello World!”到专业级的复杂系统。准备好让你的想法成真吧！

---

## 🚀 1. 你的第一步：与引擎连接

每一个伟大的项目都始于简单的一行代码。在 CES 中，我们告诉脚本连接到引擎的重要功能：

```ces
ve motor;
```
*提示：如果你喜欢更具动感的语气，也可以使用 `go motor;`。由你选择！*

### 为什么 CES 与众不同？
与其他引擎需要编写 `this.transform.position.x` 不同，在 Creative Engine 中我们取消了官僚主义：
- **无需 `this.`**：直接访问对象的属性。
- **无需复杂的前缀**：如果你的对象有一个 `Health` 组件，只需编写 `health.currentHealth = 100`。
- **多语言**：你喜欢 `posicion` 还是 `position`？引擎两者都懂！

---

## 💎 2. 公共变量：检查器是你的朋友

公共变量允许你（或你的设计师）直接从编辑器中调整值，而无需触碰代码。

```ces
publico 数字 速度 = 5;
publico 文本 消息 = "小心！";
publico 布尔值 是英雄 = 真;
publico 物质 目标;           // 在此处拖放任何对象
publico 精灵 图标;           // 选择一个图像
publico 音频 爆炸声音;       // 选择一个声音
publico 预制件 子弹预制件;   // 一个可重复使用的对象
publico 场景 下一关;         // 一个完整的场景
```

---

## ⏱️ 3. 生命周期：你的游戏心跳

你的脚本会对在关键时刻发生的自动事件做出反应：

- **`开始()` / `alEmpezar()`**：对象诞生时执行一次。非常适合设置初始值。
- **`更新(delta)` / `alActualizar(delta)`**：脚本的核心。每一帧都会执行。`delta` 是帧之间的确切时间，使用它可以使移动平滑。
- **`actualizarFijo(delta)`**：非常适合重型物理计算。以恒定的时间间隔执行。
- **`alHacerClick()`**：当用户点击或触摸对象时触发。

---

## ⌨️ 4. 输入与移动

控制角色移动就像说话一样自然：

```ces
更新(delta) {
    // 简单的水平移动
    如果 (teclaPresionada("d")) {
        posicion.x += 速度 * delta;
        水平翻转 = 假; // 向右看
    }
    如果 (teclaPresionada("a")) {
        posicion.x -= 速度 * delta;
        水平翻转 = 真; // 向左看
    }

    // 单击跳跃
    如果 (teclaRecienPresionada("Space") 并且 estaTocandoTag("Ground")) {
        fisica.applyImpulse(新建 Vector2(0, -12));
        播放.Salto(); // 瞬间调用“Salto”动画！
    }
}
```

---

## 📦 5. 组件参考（专家模式）

引擎会自动创建对对象所有组件的快速访问。这是主列表：

| 组件 | 访问（别名） | 关键功能 |
| :--- | :--- | :--- |
| **Transform** | `posicion`, `位置` | `x`, `y`, `rotacion`, `escala`, `mirarA(x,y)` |
| **Rigidbody2D** | `fisica`, `物理` | `applyForce(x,y)`, `applyImpulse(x,y)`, `velocity` |
| **SpriteRenderer**| `renderizadorDeSprite` | `color`, `opacity`, `spriteName` |
| **Animator** | `animador`, `动画器` | `play(name)`, `stop()`, `crossfade(name, time)` |
| **Health** | `jiankang`, `vida` | `damage(amount)`, `heal(amount)`, `isDead` |
| **AudioSource** | `sonido`, `audio` | `play()`, `stop()`, `volumen`, `bucle` |
| **Attack** | `ataque`, `gongji` | `executeAttack(atk)`, `cooldown` |
| **ProgressBar** | `barra`, `uiTiao` | `value`, `maxValue`, `materiaObjetivo` |

---

## 📡 6. 通信：全局消息

你想在 Boss 被击败时让所有敌人都死去吗？不要寻找复杂的引用，使用**消息**。

**在 Boss 脚本中：**
```ces
alMorir() {
    broadcast("BossDefeated", { bonus: 500 });
}
```

**在任何其他脚本中：**
```ces
开始() {
    onReceive("BossDefeated", (data) => {
        imprimir("胜利！奖励：" + data.bonus);
        destroy(mtr); // 对象自我销毁
    });
}
```

---

## 🪄 7. 魔法函数与协程

### ⏳ 协程 (`等待`)
在不停止游戏的情况下暂停执行。非常适合序列：
```ces
async 开始() {
    imprimir("启动序列...");
    等待(2);
    imprimir("已经过去了2秒！");
    播放.Explosion();
}
```

### 🔁 定时循环 (`cada`)
干净地创建周期性事件：
```ces
开始() {
    cada(3) { // 每3秒
        create enemyPrefab;
        imprimir("一个新敌人出现了。");
    }
}
```

---

## 🍳 8. 食谱 (Cookbook)

### 🏃 专业双重跳跃
```ces
ve motor;
publico 数字 最大跳跃次数 = 2;
数字 剩余跳跃次数 = 2;

更新(delta) {
    如果 (estaTocandoTag("Ground")) {
        剩余跳跃次数 = 最大跳跃次数;
    }

    如果 (teclaRecienPresionada("Space") 并且 剩余跳跃次数 > 0) {
        fisica.velocity.y = -10; // 垂直冲力
        剩余跳跃次数 -= 1;
        播放.Salto();
    }
}
```

### 🎥 平滑摄像机 (Smooth Follow)
```ces
ve motor;
publico 物质 目标;
publico 数字 平滑度 = 0.125;

更新(delta) {
    如果 (目标) {
        variable 理想位置 = { x: 目标.posicion.x, y: 目标.posicion.y };
        posicion.x += (理想位置.x - posicion.x) * 平滑度;
        posicion.y += (理想位置.y - posicion.y) * 平滑度;
    }
}
```

### 🎒 简单背包系统
```ces
ve motor;
variable 背包 = [];

alEntrarEnColision(otro) {
    如果 (otro.hasTag("Item")) {
        背包.push(otro.nombre);
        imprimir("拾取了：" + otro.nombre + "。总计：" + 背包.length);
        destruir(otro);
    }
}
```

---

## ⚙️ 9. 底层原理：转译器

引擎使用一个**智能转译**系统。这意味着当你使用 CES 编写代码时，引擎会实时将你的代码翻译成高性能的优化 JavaScript。

- **安全**：引擎在运行游戏前检测错误。
- **速度**：在浏览器中原生运行，没有沉重的分层。
- **灵活性**：如果你是专家，可以在 CES 脚本中使用任何 JavaScript 函数。

---

## 🎨 10. 结语：你的极限就是你的想象力！

**Creative Engine** 中的脚本编写旨在让你专注于有趣的部分：**创作**。一开始不必担心完美的语法；引擎会一路为你提供帮助。

请记住：**每一个伟大的游戏都始于一行简单的代码。** 你的第一行会是什么？

> “编程不在于你懂什么，而在于你能想象出什么。”

---
*需要更多帮助？访问我们的 Discord 社区或查阅 [组件指南](README_COMPONENTES.md)。*
