FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install
COPY . .
RUN npm run -w shared build && npm run -w server build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/server
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:generate && npm run prisma:migrate && npm run seed && npm run start"]
