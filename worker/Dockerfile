# syntax=docker/dockerfile:1
FROM node:18-bullseye
WORKDIR /app

COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./
RUN corepack enable && ( [ -f pnpm-lock.yaml ] && pnpm i || npm i )

COPY tsconfig.json ./
COPY src ./src

RUN (pnpm run build || npm run build)

ENV NODE_ENV=production
CMD ["node","dist/index.js"]
