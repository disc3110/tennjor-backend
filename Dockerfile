# Etapa 1: build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Prisma on alpine usually needs openssl
RUN apk add --no-cache openssl

# Copiar package files primero
COPY package*.json ./

RUN npm install

# Copiar el resto del proyecto
COPY . .

# Generar Prisma client y compilar Nest
RUN npx prisma generate
RUN npm run build

# Etapa 2: runtime
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copiamos lo necesario
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["npm", "run", "start:prod"]