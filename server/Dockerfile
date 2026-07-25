FROM node:20-alpine
WORKDIR /app
# Install build dependencies (if needed)
RUN apk add --no-cache python3 make g++
# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev
# Copy source code
COPY . .
# Build client assets
RUN npm --prefix client ci && npm --prefix client run build
# Set runtime environment
ENV NODE_ENV=production
# Port will be set by Railway at runtime
EXPOSE $PORT
CMD ["node", "index.js"]
