FROM node:24-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:24-alpine AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="postgresql://app:app@db:5432" \
    BETTER_AUTH_SECRET="docker-build-only-secret-at-least-32-characters" \
    BETTER_AUTH_URL="https://localhost" \
    SKIP_ENV_VALIDATION=1 \
    npm run build

FROM node:24-alpine AS deploy

WORKDIR /app

ENV NODE_ENV="production"

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
