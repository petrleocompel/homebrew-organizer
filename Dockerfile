FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN DATABASE_URL="postgresql://app:app@db:5432" \
    BETTER_AUTH_SECRET="docker-build-only-secret-at-least-32-characters" \
    BETTER_AUTH_URL="https://localhost" \
    SKIP_ENV_VALIDATION=1 \
    pnpm build

ENV NODE_ENV="production"

EXPOSE 3000
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]
