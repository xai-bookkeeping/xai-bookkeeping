FROM node:24-bookworm-slim

ENV NODE_ENV=development

WORKDIR /app/frontend

COPY package.json package-lock.json* ./

RUN npm install

COPY index.html tailwind.config.ts tsconfig.json vite.config.ts vitest.config.ts ./
COPY src ./src

EXPOSE 5173

CMD ["sh", "-lc", "npm run dev -- --host 0.0.0.0 --port ${WEB_CONTAINER_PORT:-5173}"]
