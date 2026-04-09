FROM node:22-alpine

# Install system dependencies Prisma needs
RUN apk add --no-cache openssl bash libc6-compat

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

CMD ["npm", "run", "start:dev"]