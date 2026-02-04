FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt) and OpenSSL for Prisma
RUN apk add --no-cache openssl python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Development command (overridden in docker-compose)
CMD ["npm", "run", "dev"]
