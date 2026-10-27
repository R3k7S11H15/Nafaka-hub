FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY backend-node/package*.json ./backend-node/
RUN npm ci && cd backend-node && npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend-node/package*.json ./backend-node/
COPY --from=builder /app/backend-node ./backend-node

EXPOSE 5173 3000

CMD ["sh", "-c", "cd backend-node && node server.js & npx vite preview --port 5173 --host 0.0.0.0"]
