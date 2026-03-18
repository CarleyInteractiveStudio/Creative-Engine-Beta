# 📚 库和扩展性指南 - Creative Engine

Creative Engine 中的库（`.celib` 文件）允许您扩展编辑器的界面和游戏的编程能力。

---

## 🛠️ 1. 界面库（编辑器工具）

您可以使用 `CreativeEngine.API` 为编辑器创建自己的自定义窗口和工具。

---

## 🎮 2. 运行时库（脚本的新功能）

如果您想添加可在 `.ces` 脚本中使用的新功能，必须注册运行时 API。

### 示例：高级数学库

```javascript
(function() {
    const 我的计算器 = {
        sumar: (a, b) => a + b
    };
    CreativeEngine.API.registrarRuntimeAPI("我的计算器", 我的计算器);
})();
```

### 如何在脚本 (.ces) 中使用它

```ces
引擎 motor;
go "我的计算器";

开始() {
    任何 结果 = sumar(10, 5);
    log("结果: " + 结果);
}
```
