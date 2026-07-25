# Multi-stage build: client + server in one image

# --- Client build ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Server ---
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
# PORT is injected by Railway at runtime
EXPOSE 8080

CMD ["node", "index.js"]
