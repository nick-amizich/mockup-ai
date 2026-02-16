# Mockup AI Sandbox - Docker Image
# Runs the Claude Code SDK executor with WebSocket server

FROM node:20-slim

# Install git (needed for potential repo cloning in Phase 2)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Create temp directory for workspaces
RUN mkdir -p /tmp/mockup-ai && chmod 777 /tmp/mockup-ai

# Expose WebSocket port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const ws = require('ws'); const client = new ws('ws://localhost:3001'); client.on('open', () => process.exit(0)); client.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 5000);"

# Run the server
CMD ["node", "dist/server.js"]
