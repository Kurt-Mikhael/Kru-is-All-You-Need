FROM node:20-alpine AS base
WORKDIR /app

# deps
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build
# runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./package.json
COPY next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "start"]
