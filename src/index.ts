#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// 导入zod验证库
import { z } from "zod";

// 定义菜谱的类型接口
interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  text_quantity: string;
  notes: string;
}

interface Step {
  step: number;
  description: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  source_path: string;
  image_path: string | null;
  category: string;
  difficulty: number;
  tags: string[];
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  additional_notes: string[];
}

// 添加简化版的Recipe接口，只包含id、name和description
interface SimpleRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: {
    name: string;
    text_quantity: string;
  }[];
}

// 更简化的Recipe接口，只包含name和description，用于getAllRecipes
interface NameOnlyRecipe {
  name: string;
  description: string;
}

// 创建简化版的Recipe数据
function simplifyRecipe(recipe: Recipe): SimpleRecipe {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    ingredients: recipe.ingredients.map(ingredient => ({
      name: ingredient.name,
      text_quantity: ingredient.text_quantity
    }))
  };
}

// 创建只包含name和description的Recipe数据
function simplifyRecipeNameOnly(recipe: Recipe): NameOnlyRecipe {
  return {
    name: recipe.name,
    description: recipe.description
  };
}

// 远程菜谱JSON文件URL
const RECIPES_URL = 'https://mp-bc8d1f0a-3356-4a4e-8592-f73a3371baa2.cdn.bspapp.com/all_recipes.json';

// 读取菜谱数据
let recipes: Recipe[] = [];

// 从远程URL获取数据的异步函数
async function fetchRecipes(): Promise<Recipe[]> {
  try {
    // 使用fetch API获取远程数据
    const response = await fetch(RECIPES_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // 解析JSON数据
    const data = await response.json();
    return data as Recipe[];
  } catch (error) {
    console.error('获取远程菜谱数据失败:', error);
    // 直接返回空数组，不尝试使用本地备份
    return [];
  }
}

// 创建MCP服务器
const server = new McpServer({
  name: "howtocook-mcp",
  version: "0.0.5",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 启动服务的主函数
export async function startServer() {
  // 获取菜谱数据
  recipes = await fetchRecipes();
  
  // 确保我们读取到了菜谱数据
  if (recipes.length === 0) {
    process.exit(1);
  }
  

  // 获取所有分类
  const getAllCategories = () => {
    const categories = new Set<string>();
    recipes.forEach((recipe) => {
      if (recipe.category) {
        categories.add(recipe.category);
      }
    });
    return Array.from(categories);
  };

  const categories = getAllCategories();

  // Tool 1: 查询全部菜谱
  server.tool(
    "mcp_howtocook_getAllRecipes",
    "获取所有菜谱",
    {
      'no_params': z.string().optional()
                   .describe('无参数')
    }, // 使用可选参数提供描述
    async () => {
      // 返回更简化版的菜谱数据，只包含name和description
      const simplifiedRecipes = recipes.map(simplifyRecipeNameOnly);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(simplifiedRecipes, null, 2),
          },
        ],
      };
    }
  );

  // Tool 2: 根据分类查询菜谱
  server.tool(
    "mcp_howtocook_getRecipesByCategory",
    `根据分类查询菜谱，可选分类有: ${categories.join(', ')}`,
    {
      category: z.enum(categories as [string, ...string[]])
                .describe('菜谱分类名称，如水产、早餐、荤菜、主食等')
    },
    async ({ category }: { category: string }) => {
      const filteredRecipes = recipes.filter((recipe) => recipe.category === category);
      // 返回简化版的菜谱数据
      const simplifiedRecipes = filteredRecipes.map(simplifyRecipe);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(simplifiedRecipes, null, 2),
          },
        ],
      };
    }
  );

  // Tool 3: 智能推荐菜谱
  server.tool(
    "mcp_howtocook_recommendMeals",
    "根据用户的忌口、过敏原、人数智能推荐菜谱，创建一周的膳食计划以及大致的购物清单",
    {
      allergies: z.array(z.string()).optional()
                 .describe('过敏原列表，如["大蒜", "虾"]'),
      avoidItems: z.array(z.string()).optional()
                  .describe('忌口食材列表，如["葱", "姜"]'),
      peopleCount: z.number().int().min(1).max(10)
                   .describe('用餐人数，1-10之间的整数')
    },
    async ({ allergies = [], avoidItems = [], peopleCount }: { 
      allergies?: string[], 
      avoidItems?: string[], 
      peopleCount: number 
    }) => {
      // 过滤掉含有忌口和过敏原的菜谱
      const filteredRecipes = recipes.filter((recipe) => {
        // 检查是否包含过敏原或忌口食材
        const hasAllergiesOrAvoidItems = recipe.ingredients?.some((ingredient) => {
          const name = ingredient.name?.toLowerCase() || '';
          return allergies.some(allergy => name.includes(allergy.toLowerCase())) || 
                 avoidItems.some(item => name.includes(item.toLowerCase()));
        });
        
        return !hasAllergiesOrAvoidItems;
      });

      // 将菜谱按分类分组
      const recipesByCategory: Record<string, Recipe[]> = {};
      const targetCategories = ['水产', '早餐', '荤菜', '主食'];
      
      filteredRecipes.forEach((recipe) => {
        if (targetCategories.includes(recipe.category)) {
          if (!recipesByCategory[recipe.category]) {
            recipesByCategory[recipe.category] = [];
          }
          recipesByCategory[recipe.category].push(recipe);
        }
      });

      // 创建每周膳食计划
      const mealPlan: {
        weekdays: Array<{
          day: string;
          breakfast: SimpleRecipe[];
          lunch: SimpleRecipe[];
          dinner: SimpleRecipe[];
        }>;
        weekend: Array<{
          day: string;
          breakfast: SimpleRecipe[];
          lunch: SimpleRecipe[];
          dinner: SimpleRecipe[];
        }>;
        groceryList: {
          ingredients: Array<{
            name: string;
            totalQuantity: number | null;
            unit: string | null;
            recipeCount: number;
            recipes: string[];
          }>;
          shoppingPlan: {
            fresh: string[];
            pantry: string[];
            spices: string[];
            others: string[];
          };
        };
      } = {
        weekdays: [],
        weekend: [],
        groceryList: {
          ingredients: [],
          shoppingPlan: {
            fresh: [],
            pantry: [],
            spices: [],
            others: []
          }
        }
      };

      // 用于跟踪已经选择的菜谱，以便后续处理食材信息
      const selectedRecipes: Recipe[] = [];

      // 周一至周五
      for (let i = 0; i < 5; i++) {
        const dayPlan = {
          day: ['周一', '周二', '周三', '周四', '周五'][i],
          breakfast: [] as SimpleRecipe[],
          lunch: [] as SimpleRecipe[],
          dinner: [] as SimpleRecipe[]
        };

        // 早餐 - 根据人数推荐1-2个早餐菜单
        const breakfastCount = Math.max(1, Math.ceil(peopleCount / 5));
        for (let j = 0; j < breakfastCount && recipesByCategory['早餐'] && recipesByCategory['早餐'].length > 0; j++) {
          const breakfastIndex = Math.floor(Math.random() * recipesByCategory['早餐'].length);
          const selectedRecipe = recipesByCategory['早餐'][breakfastIndex];
          selectedRecipes.push(selectedRecipe);
          dayPlan.breakfast.push(simplifyRecipe(selectedRecipe));
          // 避免重复，从候选列表中移除
          recipesByCategory['早餐'] = recipesByCategory['早餐'].filter((_, idx) => idx !== breakfastIndex);
        }

        // 午餐和晚餐的菜谱数量，根据人数确定
        const mealCount = Math.max(2, Math.ceil(peopleCount / 3));
        
        // 午餐
        for (let j = 0; j < mealCount; j++) {
          // 随机选择菜系：主食、水产、蔬菜、荤菜等
          const categories = ['主食', '水产', '荤菜', '素菜', '甜品'];
          let selectedCategory = categories[Math.floor(Math.random() * categories.length)];
          
          // 如果该分类没有菜谱或已用完，尝试其他分类
          while (!recipesByCategory[selectedCategory] || recipesByCategory[selectedCategory].length === 0) {
            selectedCategory = categories[Math.floor(Math.random() * categories.length)];
            if (categories.every(cat => !recipesByCategory[cat] || recipesByCategory[cat].length === 0)) {
              break; // 所有分类都没有可用菜谱，退出循环
            }
          }
          
          if (recipesByCategory[selectedCategory] && recipesByCategory[selectedCategory].length > 0) {
            const index = Math.floor(Math.random() * recipesByCategory[selectedCategory].length);
            const selectedRecipe = recipesByCategory[selectedCategory][index];
            selectedRecipes.push(selectedRecipe);
            dayPlan.lunch.push(simplifyRecipe(selectedRecipe));
            // 避免重复，从候选列表中移除
            recipesByCategory[selectedCategory] = recipesByCategory[selectedCategory].filter((_, idx) => idx !== index);
          }
        }
        
        // 晚餐
        for (let j = 0; j < mealCount; j++) {
          // 随机选择菜系，与午餐类似但可添加汤羹
          const categories = ['主食', '水产', '荤菜', '素菜', '甜品', '汤羹'];
          let selectedCategory = categories[Math.floor(Math.random() * categories.length)];
          
          // 如果该分类没有菜谱或已用完，尝试其他分类
          while (!recipesByCategory[selectedCategory] || recipesByCategory[selectedCategory].length === 0) {
            selectedCategory = categories[Math.floor(Math.random() * categories.length)];
            if (categories.every(cat => !recipesByCategory[cat] || recipesByCategory[cat].length === 0)) {
              break; // 所有分类都没有可用菜谱，退出循环
            }
          }
          
          if (recipesByCategory[selectedCategory] && recipesByCategory[selectedCategory].length > 0) {
            const index = Math.floor(Math.random() * recipesByCategory[selectedCategory].length);
            const selectedRecipe = recipesByCategory[selectedCategory][index];
            selectedRecipes.push(selectedRecipe);
            dayPlan.dinner.push(simplifyRecipe(selectedRecipe));
            // 避免重复，从候选列表中移除
            recipesByCategory[selectedCategory] = recipesByCategory[selectedCategory].filter((_, idx) => idx !== index);
          }
        }

        mealPlan.weekdays.push(dayPlan);
      }

      // 周六和周日
      for (let i = 0; i < 2; i++) {
        const dayPlan = {
          day: ['周六', '周日'][i],
          breakfast: [] as SimpleRecipe[],
          lunch: [] as SimpleRecipe[],
          dinner: [] as SimpleRecipe[]
        };

        // 早餐 - 根据人数推荐菜品，至少2个菜品，随人数增加
        const breakfastCount = Math.max(2, Math.ceil(peopleCount / 3));
        for (let j = 0; j < breakfastCount && recipesByCategory['早餐'] && recipesByCategory['早餐'].length > 0; j++) {
          const breakfastIndex = Math.floor(Math.random() * recipesByCategory['早餐'].length);
          const selectedRecipe = recipesByCategory['早餐'][breakfastIndex];
          selectedRecipes.push(selectedRecipe);
          dayPlan.breakfast.push(simplifyRecipe(selectedRecipe));
          recipesByCategory['早餐'] = recipesByCategory['早餐'].filter((_, idx) => idx !== breakfastIndex);
        }

        // 计算工作日的基础菜品数量
        const weekdayMealCount = Math.max(2, Math.ceil(peopleCount / 3));
        // 周末菜品数量：比工作日多1-2个菜，随人数增加
        const weekendAddition = peopleCount <= 4 ? 1 : 2; // 4人以下多1个菜，4人以上多2个菜
        const mealCount = weekdayMealCount + weekendAddition;

        const getMeals = (count: number): SimpleRecipe[] => {
          const result: SimpleRecipe[] = [];
          const categories = ['荤菜', '水产'];
          
          // 尽量平均分配不同分类的菜品
          for (let j = 0; j < count; j++) {
            const category = categories[j % categories.length];
            if (recipesByCategory[category] && recipesByCategory[category].length > 0) {
              const index = Math.floor(Math.random() * recipesByCategory[category].length);
              const selectedRecipe = recipesByCategory[category][index];
              selectedRecipes.push(selectedRecipe);
              result.push(simplifyRecipe(selectedRecipe));
              recipesByCategory[category] = recipesByCategory[category].filter((_, idx) => idx !== index);
            } else if (recipesByCategory['主食'] && recipesByCategory['主食'].length > 0) {
              // 如果没有足够的荤菜或水产，使用主食
              const index = Math.floor(Math.random() * recipesByCategory['主食'].length);
              const selectedRecipe = recipesByCategory['主食'][index];
              selectedRecipes.push(selectedRecipe);
              result.push(simplifyRecipe(selectedRecipe));
              recipesByCategory['主食'] = recipesByCategory['主食'].filter((_, idx) => idx !== index);
            }
          }
          
          return result;
        };

        dayPlan.lunch = getMeals(mealCount);
        dayPlan.dinner = getMeals(mealCount);

        mealPlan.weekend.push(dayPlan);
      }

      // 统计食材清单，收集所有菜谱的所有食材
      const ingredientMap = new Map<string, {
        totalQuantity: number | null,
        unit: string | null,
        recipeCount: number,
        recipes: string[]
      }>();

      // 处理一个菜谱的所有食材
      const processRecipeIngredients = (recipe: Recipe) => {
        recipe.ingredients?.forEach(ingredient => {
          const key = ingredient.name.toLowerCase();
          
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, {
              totalQuantity: ingredient.quantity,
              unit: ingredient.unit,
              recipeCount: 1,
              recipes: [recipe.name]
            });
          } else {
            const existing = ingredientMap.get(key)!;
            
            // 对于有明确数量和单位的食材，进行汇总
            if (existing.unit && ingredient.unit && existing.unit === ingredient.unit && existing.totalQuantity !== null && ingredient.quantity !== null) {
              existing.totalQuantity += ingredient.quantity;
            } else {
              // 否则保留 null，表示数量不确定
              existing.totalQuantity = null;
              existing.unit = null;
            }
            
            existing.recipeCount += 1;
            if (!existing.recipes.includes(recipe.name)) {
              existing.recipes.push(recipe.name);
            }
          }
        });
      };

      // 处理所有菜谱
      // 使用完整的Recipe对象处理食材信息
      selectedRecipes.forEach(processRecipeIngredients);
      
      // 整理食材清单
      for (const [name, info] of ingredientMap.entries()) {
        mealPlan.groceryList.ingredients.push({
          name,
          totalQuantity: info.totalQuantity,
          unit: info.unit,
          recipeCount: info.recipeCount,
          recipes: info.recipes
        });
      }

      // 对食材按使用频率排序
      mealPlan.groceryList.ingredients.sort((a, b) => b.recipeCount - a.recipeCount);

      // 生成购物计划，根据食材类型进行分类
      const spiceKeywords = ['盐', '糖', '酱油', '醋', '料酒', '香料', '胡椒', '孜然', '辣椒', '花椒', '姜', '蒜', '葱', '调味'];
      const freshKeywords = ['肉', '鱼', '虾', '蛋', '奶', '菜', '菠菜', '白菜', '青菜', '豆腐', '生菜', '水产', '豆芽', '西红柿', '番茄', '水果', '香菇', '木耳', '蘑菇'];
      const pantryKeywords = ['米', '面', '粉', '油', '酒', '醋', '糖', '盐', '酱', '豆', '干', '罐头', '方便面', '面条', '米饭', '意大利面', '燕麦'];

      mealPlan.groceryList.ingredients.forEach(ingredient => {
        const name = ingredient.name.toLowerCase();
        
        if (spiceKeywords.some(keyword => name.includes(keyword))) {
          mealPlan.groceryList.shoppingPlan.spices.push(ingredient.name);
        } else if (freshKeywords.some(keyword => name.includes(keyword))) {
          mealPlan.groceryList.shoppingPlan.fresh.push(ingredient.name);
        } else if (pantryKeywords.some(keyword => name.includes(keyword))) {
          mealPlan.groceryList.shoppingPlan.pantry.push(ingredient.name);
        } else {
          mealPlan.groceryList.shoppingPlan.others.push(ingredient.name);
        }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mealPlan, null, 2),
          },
        ],
      };
    }
  );

  // Tool 4: 不知道吃什么，根据人数直接推荐
  server.tool(
    "mcp_howtocook_whatToEat",
    "不知道吃什么？根据人数直接推荐适合的菜品组合",
    {
      peopleCount: z.number().int().min(1).max(10)
                   .describe('用餐人数，1-10之间的整数，会根据人数推荐合适数量的菜品')
    },
    async ({ peopleCount }: { peopleCount: number }) => {
      // 根据人数计算荤素菜数量
      const vegetableCount = Math.floor((peopleCount + 1) / 2);
      const meatCount = Math.ceil((peopleCount + 1) / 2);
      
      // 获取所有荤菜
      let meatDishes = recipes.filter((recipe) => 
        recipe.category === '荤菜' || recipe.category === '水产'
      );
      
      // 获取其他可能的菜品（当做素菜）
      let vegetableDishes = recipes.filter((recipe) => 
        recipe.category !== '荤菜' && recipe.category !== '水产' && 
        recipe.category !== '早餐' && recipe.category !== '主食'
      );
      
      // 特别处理：如果人数超过8人，增加鱼类荤菜
      let recommendedDishes: Recipe[] = [];
      let fishDish: Recipe | null = null;
      
      if (peopleCount > 8) {
        const fishDishes = recipes.filter((recipe) => recipe.category === '水产');
        if (fishDishes.length > 0) {
          fishDish = fishDishes[Math.floor(Math.random() * fishDishes.length)];
          recommendedDishes.push(fishDish);
        }
      }
      
      // 按照不同肉类的优先级选择荤菜
      const meatTypes = ['猪肉', '鸡肉', '牛肉', '羊肉', '鸭肉', '鱼肉'];
      const selectedMeatDishes: Recipe[] = [];
      
      // 需要选择的荤菜数量
      const remainingMeatCount = fishDish ? meatCount - 1 : meatCount;
      
      // 尝试按照肉类优先级选择荤菜
      for (const meatType of meatTypes) {
        if (selectedMeatDishes.length >= remainingMeatCount) break;
        
        const meatTypeOptions = meatDishes.filter((dish) => {
          // 检查菜品的材料是否包含这种肉类
          return dish.ingredients?.some((ingredient) => {
            const name = ingredient.name?.toLowerCase() || '';
            return name.includes(meatType.toLowerCase());
          });
        });
        
        if (meatTypeOptions.length > 0) {
          // 随机选择一道这种肉类的菜
          const selected = meatTypeOptions[Math.floor(Math.random() * meatTypeOptions.length)];
          selectedMeatDishes.push(selected);
          // 从可选列表中移除，避免重复选择
          meatDishes = meatDishes.filter((dish) => dish.id !== selected.id);
        }
      }
      
      // 如果通过肉类筛选的荤菜不够，随机选择剩余的
      while (selectedMeatDishes.length < remainingMeatCount && meatDishes.length > 0) {
        const randomIndex = Math.floor(Math.random() * meatDishes.length);
        selectedMeatDishes.push(meatDishes[randomIndex]);
        meatDishes.splice(randomIndex, 1);
      }
      
      // 随机选择素菜
      const selectedVegetableDishes: Recipe[] = [];
      while (selectedVegetableDishes.length < vegetableCount && vegetableDishes.length > 0) {
        const randomIndex = Math.floor(Math.random() * vegetableDishes.length);
        selectedVegetableDishes.push(vegetableDishes[randomIndex]);
        vegetableDishes.splice(randomIndex, 1);
      }
      
      // 合并推荐菜单
      recommendedDishes = recommendedDishes.concat(selectedMeatDishes, selectedVegetableDishes);
      
      // 为人数多的情况考虑增加甜味菜品
      const recommendationDetails = {
        peopleCount,
        meatDishCount: meatCount,
        vegetableDishCount: vegetableCount,
        dishes: recommendedDishes.map(simplifyRecipe),
        message: `为${peopleCount}人推荐的菜品，包含${selectedMeatDishes.length}个荤菜和${selectedVegetableDishes.length}个素菜。`
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recommendationDetails, null, 2),
          },
        ],
      };
    }
  );

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

