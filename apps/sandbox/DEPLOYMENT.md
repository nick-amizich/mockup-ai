# Sandbox Deployment Guide

Deploy the Mockup AI sandbox to Digital Ocean (or any Docker-compatible host).

## Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server
- SSL certificate (Let's Encrypt recommended)
- Anthropic API key

## Quick Start (Development)

```bash
# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Run sandbox only (no SSL)
docker-compose up sandbox
```

## Production Deployment

### 1. Server Setup (Digital Ocean)

```bash
# Create droplet (Ubuntu 24.04, $12/mo basic)
# SSH into server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt-get install docker-compose-plugin
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt-get install certbot

# Get certificate
certbot certonly --standalone -d sandbox.yourdomain.com

# Copy certificates
mkdir -p /opt/mockup-ai/ssl
cp /etc/letsencrypt/live/sandbox.yourdomain.com/fullchain.pem /opt/mockup-ai/ssl/
cp /etc/letsencrypt/live/sandbox.yourdomain.com/privkey.pem /opt/mockup-ai/ssl/
```

### 3. Deploy Application

```bash
# Clone repository
cd /opt
git clone https://github.com/yourusername/mockup-ai.git
cd mockup-ai/apps/sandbox

# Create environment file
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=production
PORT=3001
EOF

# Copy SSL certificates
ln -s /opt/mockup-ai/ssl ./ssl

# Start with production profile (includes nginx)
docker-compose --profile production up -d
```

### 4. Process Management (Optional)

```bash
# Install PM2 for Docker process management
npm install -g pm2

# Configure PM2 to restart on boot
pm2 startup
pm2 save
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `PORT` | No | WebSocket server port (default: 3001) |
| `NODE_ENV` | No | Environment (production/development) |

## Endpoints

- `wss://sandbox.yourdomain.com` - WebSocket endpoint
- `https://sandbox.yourdomain.com/health` - Health check

## Monitoring

```bash
# View logs
docker-compose logs -f sandbox

# Check health
curl https://sandbox.yourdomain.com/health

# Resource usage
docker stats mockup-ai-sandbox
```

## Updating

```bash
cd /opt/mockup-ai/apps/sandbox
git pull
docker-compose build
docker-compose --profile production up -d
```

## Troubleshooting

### WebSocket Connection Fails
- Check firewall allows ports 80, 443
- Verify SSL certificate is valid
- Check nginx logs: `docker-compose logs nginx`

### Claude Auth Errors
- Verify ANTHROPIC_API_KEY is set correctly
- Check sandbox logs: `docker-compose logs sandbox`

### High Memory Usage
- Workspaces are stored in /tmp, cleaned on disconnect
- Consider adding swap if memory is limited
