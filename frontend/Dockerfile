# Stage 1: Build React app
FROM node:20-alpine AS builder

ARG VITE_API_BASE_URL=/api
ARG VITE_GRAFANA_URL=http://localhost:3000

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GRAFANA_URL=${VITE_GRAFANA_URL}

RUN npm run build

# Stage 2: nginx serving
FROM nginx:1.25-alpine AS runtime

LABEL org.opencontainers.image.title="grafana-mcp-frontend" \
      org.opencontainers.image.description="React chat UI for Grafana MCP Platform"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Run as nginx non-root user (uid 101)
RUN chown -R 101:101 /usr/share/nginx/html /var/cache/nginx /var/log/nginx /tmp
USER 101:101

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3001/healthz || exit 1
