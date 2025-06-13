#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchRecipes, getAllCategories } from "./data/recipes.js";
import { registerGetAllRecipesTool } from "./tools/getAllRecipes.js";
import { registerGetRecipesByCategoryTool } from "./tools/getRecipesByCategory.js";
import { registerRecommendMealsTool } from "./tools/recommendMeals.js";
import { registerWhatToEatTool } from "./tools/whatToEat.js";
import { registerGetRecipeByIdTool } from "./tools/getRecipeById.js";

// 创建MCP服务器
const server = new McpServer({
  name: "howtocook-mcp",
  version: "0.0.8",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 启动服务的主函数
export async function startServer() {
  // 获取菜谱数据
  const recipes = await fetchRecipes();
  
  // 确保我们读取到了菜谱数据
  if (recipes.length === 0) {
    console.error('无法获取菜谱数据，服务退出');
    process.exit(1);
  }
  
  // 获取所有分类
  const categories = getAllCategories(recipes);

  // 注册所有工具
  registerGetAllRecipesTool(server, recipes);
  registerGetRecipesByCategoryTool(server, recipes, categories);
  registerRecommendMealsTool(server, recipes);
  registerWhatToEatTool(server, recipes);
  registerGetRecipeByIdTool(server, recipes);

  // 启动MCP服务器
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.log('HowToCook MCP服务器启动成功');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

