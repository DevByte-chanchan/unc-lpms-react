# LPMS composition frontend (Vite + React).
#
# Two targets:
#   dev     — the Vite dev server with HMR, for day-to-day work.
#   runtime — a production build served by `vite preview`.
#
# The build target bakes the API base URL in at build time, because Vite
# substitutes import.meta.env.VITE_API_BASE into the bundle. It must be the URL
# the *browser* uses, not the URL the container uses, so it points at the
# published host port of the backend (http://localhost:5001 by default).
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM node:22-bookworm-slim AS dev

ENV NODE_ENV=development \
    PORT=5173

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

# `npm run dev` reads HOST/PORT from the environment; vite.config.js binds
# 0.0.0.0 so the server is reachable from outside the container.
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 --port ${PORT:-5173} --strictPort"]


FROM node:22-bookworm-slim AS build

ARG VITE_API_BASE=http://localhost:5001
ENV VITE_API_BASE=${VITE_API_BASE}

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5173

WORKDIR /app

# vite preview is a devDependency, so the full install comes along. It is a
# static file server with SPA history fallback — enough for a local dev
# environment, and it keeps the image to one toolchain.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json vite.config.js ./

EXPOSE 5173

CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-5173} --strictPort"]
