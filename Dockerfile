# syntax=docker/dockerfile:1.7

# ---- 1. Dependencies -------------------------------------------------------
# NODE_ENV stays unset in this stage: npm omits devDependencies when it is
# "production", and the build needs them.
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build --------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
# Switches next.config.ts to output: "standalone".
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1

# Public configuration, baked into the client bundle and into every prerendered page.
# No default: an empty value aborts the build in readSiteUrl().
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Read by isIndexable() while robots.txt and the six pages are prerendered. "1" makes the
# image indexable, "0" forces noindex, empty leaves it noindex outside Vercel.
ARG SITE_INDEXABLE
ENV SITE_INDEXABLE=${SITE_INDEXABLE}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runtime ------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3200
ENV HOSTNAME=0.0.0.0

# The three pieces the standalone server serves: public assets, the traced server output
# (which carries server.js and its own node_modules) and the hashed build chunks.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD [ "node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3200) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" ]

CMD [ "node", "server.js" ]
