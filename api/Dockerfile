FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
RUN mkdir -p /app/storage/exports

EXPOSE 4100
CMD ["npm", "start"]
