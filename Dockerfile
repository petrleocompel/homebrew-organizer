FROM node:24-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://app:app@db:5432"
ENV BETTER_AUTH_SECRET=""
ENV BETTER_AUTH_URL="https://localhost"
ARG SENTRY_AUTH_TOKEN=""

RUN SKIP_ENV_VALIDATION=1 npm run build

FROM node:24-alpine AS deploy


WORKDIR /app

ENV NODE_ENV production

ENV DATABASE_URL="postgresql://app:app@db:5432"
ENV BETTER_AUTH_SECRET=""
ENV BETTER_AUTH_URL="https://localhost"

COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

COPY src/server/db/schema.ts ./src/server/db/schema.ts
COPY src/server/db/index.ts ./src/server/db/index.ts
COPY drizzle.config.ts ./drizzle.config.ts
COPY tsconfig.json ./tsconfig.json
COPY src/env.js ./src/env.js

RUN npm i @t3-oss/env-nextjs zod drizzle-orm

RUN mkdir /app/src/ || echo "Directory already exists"

EXPOSE 3000
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

#CMD npm run start
CMD ["node", "server.js"]


