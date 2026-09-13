# ---- Build the Vite/React app ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Serve static files with nginx (also reverse-proxies /api -> backend) ----
FROM nginx:1.29-alpine AS runtime
# nginx auto-runs envsubst on templates in /etc/nginx/templates at startup,
# so ${API_UPSTREAM} is injected from the container environment.
ENV API_UPSTREAM=http://calconnect.api:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
