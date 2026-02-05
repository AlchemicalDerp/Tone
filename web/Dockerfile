FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY shared/package.json shared/package.json
COPY web/package.json web/package.json
RUN npm install
COPY . .
RUN npm run -w shared build && npm run -w web build

FROM nginx:1.27-alpine
COPY --from=builder /app/web/dist /usr/share/nginx/html
EXPOSE 80
