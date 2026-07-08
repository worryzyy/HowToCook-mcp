# ---- 构建阶段 ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# 只安装生产依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build
# 菜谱数据：代码里按 build/../all_recipes.json 解析，放在 /app 根目录
COPY all_recipes.json ./

# 以非 root 用户运行
USER node

EXPOSE 3000

ENTRYPOINT ["node", "build/index.js"]
# 默认以 HTTP 模式启动；stdio 模式用: docker run -i --rm <image> --transport stdio
CMD ["--transport", "http", "--port", "3000"]
