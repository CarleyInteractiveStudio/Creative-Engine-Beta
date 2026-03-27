# 📜 脚本大师指南 (CES) - Creative Engine

Creative Engine 使用 **CES (Creative Engine Script)**，这是一种基于 JavaScript 的强大语言，但为游戏开发者进行了简化。

---

## 🚀 核心概念

### 1. 强制导入
每个脚本都必须以连接指令开始：
```ces
引擎 motor;
```

### 2. 直接访问
与其他引擎不同，您不需要编写 `this.` 或 `mtr.`。如果对象有 `SpriteRenderer`，直接写 `精灵渲染器` (或 `renderizadorDeSprite`)。

---

## 💎 公共变量
使用 `公开` 关键字让变量显示在检查器中。

```ces
公开 数字 速度 = 5;
公开 文本 名字 = "英雄";
公开 布尔值 无敌 = 假;
公开 物质 目标;
```

---

## ⏱️ 生命周期事件

```ces
// 当对象在游戏中出现时执行一次
开始() {
    log("你好，世界！");
}

// 每帧执行一次
更新(delta) {
}
```

---

## 🪄 特殊函数与代理

### ⏳ 协程 (等待)
```ces
开始() {
    等待(3);
    log("3秒过去了！");
}
```

### 🎭 动画与音效代理
直接通过名称调用状态或剪辑：
```ces
reproducir.Caminar(); // 在 AnimatorController 中
play.Jump();
```
