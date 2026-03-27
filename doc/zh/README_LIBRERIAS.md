# 📜 扩展全书：库与工具 (.celib) — Creative Engine

欢迎来到工具开发者的圣殿。如果你来到了这里，说明你不仅想使用引擎，还想成为它的**一部分**。在 Creative Engine 中，可扩展性不是事后才添加的补丁，而是一个核心特性。

本书详细介绍了如何注入你自己的 JavaScript (ES6) 代码来创建自定义界面或全局 API，从而赋能你的整个团队。

---

## 📖 目录

1. [第一章：扩展生态系统](#第一章：扩展生态系统)
2. [第二章：全局 API 注册](#第二章：全局-api-注册)
3. [第三章：用户界面 (UI) 构建](#第三章：用户界面-ui-构建)
4. [第四章：面板组件参考](#第四章：面板组件参考)
5. [第五章：引擎钩子 (Hooks) 与事件](#第五章：引擎钩子-hooks-与事件)
6. [第六章：案例研究：程序化关卡生成器](#第六章：案例研究：程序化关卡生成器)
7. [第七章：库调试](#第七章：库调试)
8. [第八章：发布与最佳实践](#第八章：发布与最佳实践)

---

## 🏛️ 第一章：扩展生态系统

Creative Engine 中的库分为两个主要类别：
1. **编辑器库：** 添加仅在你设计游戏时存在的按钮、窗口和工具。
2. **运行时库：** 注入 `.ces` 脚本在游戏运行期间可以调用的函数（例如：云存档系统）。

存放在 `/lib` 文件夹中的任何 `.js` 或 `.celib` 文件都会在编辑器启动时自动加载。

---

## 🧪 第二章：全局注册

一切的入口都是 `CreativeEngine.API` 对象。该对象允许你安全地与引擎内部进行通信。

### 运行时 API 注册
如果你希望一个函数对所有 CES 脚本可用：

```javascript
(function() {
    const MySystem = {
        calculateDistance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        config: { version: "1.0" }
    };
    CreativeEngine.API.registrarRuntimeAPI("Geometry", MySystem);
})();
```

**效果：** 在任何 CES 脚本中，你现在可以使用 `go "Geometry";` 并调用 `calculateDistance()`。

---

## 🎨 第三章：用户界面 (UI) 构建

Creative Engine 使用声明式 API 来构建工具。你不需要了解 HTML 或 CSS；引擎会负责布局，使其与编辑器的审美相匹配。

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "数据探索器",
    ancho: 400,
    alto: 300,
    alAbrir: function(panel) {
        panel.columna((col) => {
            col.texto("系统状态", { negrita: true });
            col.separador();
            col.boton("刷新", () => MyLogic.update());
        });
    }
});
```

---

## 🍱 第四章：组件参考

### 输入元素
- **`input(标签, 回调)`**：接收字符串。
- **`numero(标签, 回调)`**：自动过滤，仅允许数字。
- **`checkbox(标签, 初始值, 回调)`**：返回布尔值。
- **`slider(标签, 选项, 回调)`**：选项：`{ min, max, paso }`。

### 视觉元素
- **`texto(值, 样式)`**：支持 `color`, `fontSize`, `bold`。
- **`imagen(url)`**：用于预览精灵或纹理。

---

## 🪝 第五章：钩子与事件

你的库可以对引擎中发生的事情做出反应。

### 选择事件
```javascript
window.addEventListener('mtrSelected', (e) => {
    const materia = e.detail; // 当前选中的对象
    console.log("已选中: " + materia.name);
});
```

### 场景事件
- `sceneLoaded`：关卡加载完成时。
- `gameStarted` / `gameStopped`：适用于仅在游戏期间初始化本地数据库。

---

## 🚀 第六章：案例研究 - 程序化生成器

想象一个自动创建敌人网格的工具：

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "生成大师",
    alAbrir: (ui) => {
        let quantity = 10;
        ui.numero("数量", (v) => quantity = v);
        ui.boton("生成！", async () => {
            for(let i=0; i<quantity; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                await window.SceneManager.instantiatePrefabFromPath("Assets/Enemy.ceprefab", x, y);
            }
        });
    }
});
```

---

## 🐛 第七章：库调试

由于库是纯 JavaScript，你可以使用浏览器的开发者工具 (F12)：
1. 打开 **Sources** 选项卡。
2. 在 `lib/` 文件夹中找到你的文件。
3. 设置断点。
4. 使用 `console.dir(window.CreativeEngine)` 查看可用的 API。

---

## 📦 第八章：发布与最佳实践

- **封装：** 始终使用 `(function() { ... })();` 模式，避免污染全局空间。
- **性能：** 不要再编辑器的 UI 线程上执行繁重计算；如有必要，请使用 `setTimeout` 或 `Worker`。

---
*本文档是一份动态指南。如果你创建了一个有用的库，请与社区分享！*
