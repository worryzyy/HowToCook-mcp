import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Recipe } from '../types/index.js'

// 获取本地JSON文件路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const LOCAL_RECIPES_PATH = join(__dirname, '../../all_recipes.json')

// 从本地文件加载菜谱数据，失败时抛出异常由调用方处理
export function fetchRecipes(): Recipe[] {
	const data = readFileSync(LOCAL_RECIPES_PATH, 'utf-8')
	const recipes = JSON.parse(data) as Recipe[]
	if (!Array.isArray(recipes) || recipes.length === 0) {
		throw new Error(`菜谱数据为空或格式错误: ${LOCAL_RECIPES_PATH}`)
	}
	return recipes
}

// 获取所有分类
export function getAllCategories(recipes: Recipe[]): string[] {
	const categories = new Set<string>()
	recipes.forEach((recipe) => {
		if (recipe.category) {
			categories.add(recipe.category)
		}
	})
	return Array.from(categories)
}
