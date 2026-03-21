# 📜 扩展全书：库与工具 (.celib) — Creative Engine

欢迎来到高级领域，架构师！如果你在这里，是因为你不仅想开发游戏，还想**开发供他人使用的工具**，或者为引擎赋予独特的功能。

在 **Creative Engine** 中，库系统 (.celib) 允许你直接向编辑器或游戏核心注入纯 JavaScript。本指南将教你如何突破现有的局限。

---

## 📖 目录

1. [第一章：扩展的力量](#第一章：扩展的力量)
2. [第二章：库 (.celib) 的剖析](#第二章：库-celib-的剖析)
3. [第三章：创建编辑器工具](#第三章：创建编辑器工具)
4. [第四章：UI 生成器 API 参考](#第四章：ui-生成器-api-参考)
5. [第五章：运行时扩展 (CES 的新 API)](#第五章：运行时扩展-ces-的新-api)
6. [第六章：专业示例 - 批量重命名工具](#第六章：专业示例---批量重命名工具)
7. [第七章：专业示例 - 全局成就系统](#第七章：专业示例---全局成就系统)
8. [第八章：安装与分发](#第八章：安装与分发)

---

## 🏛️ 第一章：扩展的力量

为什么要使用库？
- **自动化：** 创建能生成整个关卡或自动设置光照的按钮。
- **自定义 API：** 添加像 `myDatabase.save()` 这样让 CES 感觉是原生的函数。
- **个性化：** 修改编辑器的开发流程以适应你的习惯。

Creative Engine 是 **“引擎即平台”**：你握有王国的钥匙。

---

## 🦴 第二章：库 (.celib) 的剖析

库在技术上是一个标准的 JavaScript 文件，包裹在一个立即执行函数表达式 (IIFE) 中以避免命名冲突。

```javascript
(function() {
    // 你的逻辑
    console.log("我的库已成功加载。");
})();
```

---

## 🛠️ 第三章：创建编辑器工具

你可以使用 `CreativeEngine.API.registrarVentana` 向编辑器的**窗口**菜单添加自定义窗口。

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "我的工具",
        ancho: 350,
        alto: 250,
        alAbrir: function(panel) {
            panel.texto("来自代码的问候！");
            panel.boton("点击我", () => alert("成功了！"));
        }
    });
})();
```

---

## 🍱 第四章：UI 生成器 API 参考

你在 `alAbrir` 中收到的 `panel` 对象是一个动态界面工厂。以下是你可以创建的所有内容：

### 基础元素：
- **`texto(内容, 选项)`**：显示文本。选项：`{ negrita: 真, color: "#hex", tamano: "14px" }`。
- **`boton(标签, 点击回调)`**：交互式按钮。
- **`input(标签, 回调)`**：文本框。更改时回调会返回其值。
- **`numero(标签, 回调)`**：数字框，用于精确值。
- **`checkbox(标签, 初始值, 回调)`**：布尔开关。
- **`slider(标签, 选项, 回调)`**：选项：`{ min, max, paso }`。

### 布局：
- **`fila(回调)`**：创建一个水平容器。在回调内部，你将使用新的行对象。
- **`columna(回调)`**：与行相同，但是垂直的。
- **`separador()`**：一条细线，用于视觉上的分隔。
- **`imagen(源)`**：显示图标或预览图。

---

## 🎮 第五章：运行时扩展 (CES 的新 API)

这是最强大的部分：添加你的 `.ces` 脚本可以使用的函数。通过 `CreativeEngine.API.registrarRuntimeAPI` 实现。

**在你的 .js 文件中：**
```javascript
(function() {
    const MyAPI = {
        greet: (name) => "你好 " + name,
        getPoints: () => 100
    };
    CreativeEngine.API.registrarRuntimeAPI("Utilities", MyAPI);
})();
```

**在脚本 (.ces) 中的用法：**
```ces
ve motor;
go "Utilities"; // 导入扩展

alEmpezar() {
    variable msg = greet("玩家"); // 直接使用！
}
```

---

## 🚀 第六章：专业示例 - 批量重命名工具

该工具会查找场景中的所有对象并为它们添加前缀。

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "批量重命名",
        alAbrir: (ui) => {
            ui.texto("为所有对象添加前缀：");
            let prefix = "OBJ_";

            ui.input("前缀", (v) => prefix = v);

            ui.boton("全部重命名！", () => {
                const materias = window.SceneManager.currentScene.getAllMaterias();
                materias.forEach(m => m.name = prefix + m.name);
                window.updateHierarchy(); // 刷新视觉列表
                alert("已重命名 " + materias.length + " 个对象。");
            });
        }
    });
})();
```

---

## 🏆 第七章：专业示例 - 全局成就系统

创建一个持久化保存进度的系统。

```javascript
(function() {
    const Achievements = {
        list: [],
        unlock: function(id) {
            if (!this.list.includes(id)) {
                this.list.push(id);
                console.log("🏆 成就解锁：" + id);
                // 在这里你可以保存到 localStorage
            }
        }
    };
    CreativeEngine.API.registrarRuntimeAPI("Achievements", Achievements);
})();
```

---

## 📦 第八章：安装与分发

1. 将你的代码编写在一个 `.js` 文件中。
2. 将后缀名改为 `.celib`（可选，引擎也接受 `.js`）。
3. 将该文件**拖动**到编辑器的 **Assets (资源)** 面板。
4. 引擎会自动将其移动到你项目的 `/lib` 文件夹。
5. 从**库**菜单中激活它。
6. **重启编辑器**（或刷新页面）以完成代码注入。

---
*需要更底层的 API？请联系开发团队以获取低级别 SDK 访问权限。*
