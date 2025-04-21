# 🍳 HowToCook-MCP Server 🥘 -- 炫一周好饭，拒绝拼好饭

[English](./README.en.md) | 简体中文

> 让 AI 助手变身私人大厨，为你的一日三餐出谋划策！

基于[Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)打造的 MCP(Model Context Protocol)服务器，让 AI 助手能够为你推荐菜谱、规划膳食，解决"今天吃什么"的世纪难题！

数据来源：[Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook) ⭐ 没有 star 的同学快去点个星星吧！

## 🔌 支持的 MCP 客户端

本服务器适用于所有支持 MCP 协议的 AI 助手和客户端，包括但不限于：

- 🤖 Claude 桌面应用
- 📝 Cursor
- 💼 其他支持 MCP 的客户端

## ✨ 美味功能

该 MCP 服务器提供以下美食工具:

1. **📚 查询全部菜谱** - 获取所有可用菜谱数据，做菜百科全书 -- 慎用这个--上下文太大
2. **🔍 根据分类查询菜谱** - 按照分类筛选菜谱，想吃水产？早餐？荤菜？主食？一键搞定！
3. **🧩 智能推荐膳食** - 根据你的忌口、过敏原和用餐人数，为你规划整整一周的美味佳肴
4. **🎲 不知道吃什么** - 选择困难症福音！根据人数直接推荐今日菜单，再也不用纠结了

## 🚀 快速上手

### 📋 先决条件

- Node.js 16.0.0+ 🟢
- npm 或 yarn 📦

### 💻 安装步骤

1. 克隆美食仓库

```bash
git clone https://github.com/worryzyy/howtocook-mcp.git
cd howtocook-mcp-server
```

2. 安装依赖（就像准备食材一样简单！）

```bash
npm install
```

3. 编译代码（烹饪过程...）

```bash
npm run build
```

## 🍽️ 开始使用

### 🔥 启动服务器

```bash
npm start
```

### 🔧 配置 MCP 客户端

#### 推荐使用 Cursor 快速体验(两种方式)

1. 使用 npm 包：请先运行 `npm i -g howtocook-mcp` ,否则会出现 `Failed to create client`

然后在 Cursor 设置中添加 MCP 服务器配置：

```json
{
	"mcpServers": {
		"howtocook-mcp": {
			"command": "npx",
			"args": ["-y", "howtocook-mcp"]
		}
	}
}
```

2. 如果是克隆仓库本地运行，请使用如下配置

```json
{
	"mcpServers": {
		"howtocook-mcp": {
			"command": "node",
			"args": ["youpath\\howtocook-mcp\\build\\index.js"]
		}
	}
}
```

#### 其他 MCP 客户端

对于其他支持 MCP 协议的客户端，请参考各自的文档进行配置，通常需要指定：

- 服务器名称: `howtocook-mcp`
- 命令: `npx -y howtocook-mcp`

3. 重启客户端，让美食魔法生效 ✨

## 🧙‍♂️ 菜单魔法使用指南

以下是在各种 MCP 客户端中使用的示例提示语：

### 1. 📚 查询全部菜谱

无需参数，直接召唤美食全书！

```
请使用howtocook的MCP服务查询所有菜谱
```

### 2. 🔍 根据分类查询菜谱

```
请使用howtocook的MCP服务查询水产类的菜谱
```

参数:

- `category`: 菜谱分类（水产、早餐、荤菜、主食等）

### 3. 🧩 智能推荐一周菜谱

```
请使用howtocook的MCP服务为3人推荐一周菜谱，我们家不吃香菜，对虾过敏
```

参数:

- `allergies`: 过敏原列表，如 ["大蒜", "虾"]
- `avoidItems`: 忌口食材，如 ["葱", "姜"]
- `peopleCount`: 用餐人数 (1-10)

### 4. 🎲 今天吃什么？

```
请使用howtocook的MCP服务为4人晚餐推荐菜单
```

参数:

- `peopleCount`: 用餐人数 (1-10)

## 📝 小贴士

- 该包已发布至 npm，可直接通过`npm install -g howtocook-mcp`全局安装
- 本服务兼容所有支持 MCP 协议的 AI 助手和应用
- 首次使用时，AI 可能需要一点时间来熟悉如何使用这些工具（就像烧热锅一样）

## 🤝 贡献

欢迎 Fork 和 Pull Request，让我们一起完善这个美食助手！

## 📄 许可

MIT License - 随意使用，就像分享美食配方一样慷慨！

---

> 🍴 美食即将开始，胃口准备好了吗？
