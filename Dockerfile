# Etapa 1: build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar package.json y lockfile primero (para aprovechar cache)
COPY package*.json ./

RUN npm install

# Copiar el resto del código
COPY . .

# Generar cliente de Prisma y compilar Nest
RUN npx prisma generate
RUN npm run build

# Etapa 2: runtime
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copiamos solo lo necesario desde la imagen builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY package*.json ./

# Puerto donde corre Nest (por defecto 3000)
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start:prod"]