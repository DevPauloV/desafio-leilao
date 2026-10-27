# Espera os scripts npm: "build" (tsc -> dist/) e "start" (node dist/...).
FROM node:22-alpine AS deps
# O mongod do mongodb-memory-server só é usado nos testes; não baixar no build.
ENV MONGOMS_DISABLE_POSTINSTALL=1
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Obras e imagens do seed (lidas por dist/seed/seed.js; o seed nunca chama o Met).
COPY seed ./seed
USER node
EXPOSE 3000
CMD ["npm", "start"]
