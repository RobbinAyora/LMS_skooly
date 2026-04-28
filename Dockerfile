FROM node:22-alpine

# Install system dependencies required by Prisma + OpenSSL
RUN apk add --no-cache openssl bash libc6-compat

# Set working directory
WORKDIR /app

# Copy dependency files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy full project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# Expose correct backend port (IMPORTANT)
EXPOSE 5000

# Production start command (NO watch mode)
CMD ["node", "dist/main.js"]