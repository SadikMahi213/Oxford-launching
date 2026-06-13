# ─────────────────────────────────────────────────────
# ArbiGrow Frontend — Dockerfile
# Multi-stage: dev (hot-reload) and prod (Nginx)
# ─────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────
FROM node:20-alpine AS build

ARG VITE_BACKEND_URL=http://localhost:8000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Development (Vite dev server) ──────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Stage 3: Production (Nginx) ─────────────────────
FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
