# Variable Read/Write Reference

一个VSCode插件，用于分析变量引用并按读写操作进行分类展示，类似于IntelliJ IDEA的引用查看器。

## 🌟 功能特性

- **智能读写分类**: 自动分析变量的引用类型
  - **读取操作**: `variable`, `obj.property`, `array[index]`
  - **写入操作**: `variable = value`, 解构赋值等
  - **读写操作**: `variable++`, `variable += 1`, `variable--` 等

- **灵活的分组模式**:
  - 按文件分组：先按文件分类，再按读写类型细分
  - 按类型分组：直接按读、写、读写操作分类

- **直观的树形视图**: 在侧边栏展示分类后的引用，支持一键跳转到代码位置

- **LSP集成**: 基于VSCode的语言服务提供程序获取准确的引用信息

## 🚀 使用方法

### 1. 查找引用
有三种方式启动变量引用分析：

1. **右键菜单**: 在变量上右键选择 "Find References (R/W)"
2. **命令面板**: 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)，搜索 "Find References (R/W)"
3. **选中变量**: 选中变量后使用命令面板执行查找

### 2. 查看结果
分析完成后，结果会显示在资源管理器面板的 "Variable References (R/W)" 视图中。

#### 按文件分组模式 (默认)
```
📁 example.js (15)
  👁️ Reads (10)
    ○ Line 6: return count; // 读取操作
    ○ Line 14: return count * 2; // 读取操作
    ...
  ✏️ Writes (2)
    ● Line 10: count = 0; // 写入操作
    ● Line 33: count = 10; // 写入操作
  ⚙️ Read/Write (3)
    ◉ Line 5: count++; // 读写操作
    ◉ Line 17: count += 5; // 读写操作
    ...
```

#### 按类型分组模式
```
👁️ Reads (10)
  ○ Line 6: return count; // 读取操作 (example.js)
  ○ Line 14: return count * 2; // 读取操作 (example.js)
  ...
✏️ Writes (2)
  ● Line 10: count = 0; // 写入操作 (example.js)
  ...
⚙️ Read/Write (3)
  ◉ Line 5: count++; // 读写操作 (example.js)
  ...
```

### 3. 切换分组模式
点击视图标题栏的 📋 图标可以在两种分组模式之间切换。

## ⚙️ 配置选项

在VSCode设置中搜索 "Variable R/W Reference" 或手动编辑 `settings.json`：

```json
{
  "variableRwReference.autoShowPanel": true,     // 自动显示引用面板
  "variableRwReference.groupByFile": true        // 按文件分组（false为按类型分组）
}
```

## 📝 支持的语言

插件依赖于VSCode的语言服务提供程序 (LSP)，因此支持所有具有LSP支持的语言，包括但不限于：

- JavaScript / TypeScript
- Python
- Java
- C/C++
- C#
- Go
- Rust
- PHP
- 等等...

## 🎯 读写识别规则

### 读取操作
- 变量作为表达式使用：`console.log(variable)`
- 属性访问：`object.property`
- 数组访问：`array[index]`
- 函数参数：`function(variable)`
- 比较操作：`if (variable > 5)`

### 写入操作
- 直接赋值：`variable = value`
- 解构赋值：`const {variable} = object`
- 参数赋值（在某些上下文中）

### 读写操作
- 前置递增/递减：`++variable`, `--variable`
- 后置递增/递减：`variable++`, `variable--`
- 复合赋值：`variable += 1`, `variable *= 2`, `variable |= flag` 等

## 🔧 开发和贡献

### 环境要求
- Node.js 16+
- pnpm

### 构建项目
```bash
pnpm install
pnpm run build
```

### 开发模式
```bash
pnpm run dev
```

### 测试
按 `F5` 在VSCode中启动插件调试会话，或使用 `example.js` 文件测试功能。

## 📄 许可证

MIT License - 详见 [LICENSE.md](LICENSE.md)

## 🐛 问题反馈

如果遇到问题或有功能建议，请在 [GitHub Issues](https://github.com/Jeremy-Hibiki/vscode-variable-rw-reference/issues) 中反馈。

---

*让代码导航更智能，让开发更高效！* 🚀
