# build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# serve
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/conf/default.conf /etc/nginx/conf.d/default.conf
# pasta /samples vem via volume do compose
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
