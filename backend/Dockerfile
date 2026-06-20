FROM node:20-bookworm-slim

# Install FFmpeg and Tailscale
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
  && curl -fsSL https://tailscale.com/install.sh | sh \
  && rm -rf /var/lib/apt/lists/*

# Create Tailscale directories
RUN mkdir -p /var/lib/tailscale /var/cache/tailscale

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=10000
ENV FFMPEG_PATH=ffmpeg

EXPOSE 10000

# Create startup script that manages both Tailscale and Node
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start Tailscale if auth key is provided\n\
if [ -n "$TAILSCALE_AUTHKEY" ]; then\n\
  echo "Starting Tailscale..."\n\
  tailscaled &\n\
  sleep 2\n\
  tailscale up --authkey="$TAILSCALE_AUTHKEY" --hostname="${TAILSCALE_HOSTNAME:-v380-backend}" || true\n\
  echo "Tailscale started (may take a moment to connect)"\n\
fi\n\
\n\
# Start Node.js application\n\
exec npm start\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
