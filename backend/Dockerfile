FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm install --legacy-peer-deps; fi
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 8001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD npx prisma migrate deploy && npx prisma db seed && node dist/main.js
