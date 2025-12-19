import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Recipe } from '../types/index.js'

// 获取本地JSON文件路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const LOCAL_RECIPES_PATH = join(__dirname, '../../all_recipes.json')

// 从本地文件加载菜谱数据
export function fetchRecipes(): Recipe[] {
	try {
		const data = readFileSync(LOCAL_RECIPES_PATH, 'utf-8')
		return JSON.parse(data) as Recipe[]
	} catch (error) {
		console.error('加载菜谱数据失败:', error)
		return []
	}
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
