# Stage 1: Build frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend with frontend files
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

# Copy frontend build from stage 1
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

ENV NODE_ENV=production
ENV PORT=10000
ENV FFMPEG_PATH=ffmpeg

EXPOSE 10000

CMD ["npm", "start"]
