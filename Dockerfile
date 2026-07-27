FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN DATABASE_URL="postgresql://app:app@db:5432" \
    BETTER_AUTH_SECRET="docker-build-only-secret-at-least-32-characters" \
    BETTER_AUTH_URL="https://localhost" \
    SKIP_ENV_VALIDATION=1 \
    npm run build

ENV NODE_ENV="production"

EXPOSE 3000
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
