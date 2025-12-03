# QuizMaster Docker Deployment Guide

This guide explains how to deploy QuizMaster using Docker containers.

## 📋 Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and set your environment variables:

```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GEMINI_API_KEY=your_gemini_api_key_here
LOG_LEVEL=info
```

> **Important**: Generate a strong JWT secret for production:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 2. Build and Run with Docker Compose

Start both client and server:

```bash
docker-compose up -d
```

This will:
- Build the client and server images
- Start both containers
- Create persistent volumes for data, uploads, and cache
- Set up networking between containers

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001

### 4. View Logs

```bash
# View all logs
docker-compose logs -f

# View server logs only
docker-compose logs -f server

# View client logs only
docker-compose logs -f client
```

### 5. Stop the Application

```bash
docker-compose down
```

To also remove volumes (⚠️ this will delete all data):

```bash
docker-compose down -v
```

## 🔧 Individual Container Deployment

### Deploy Server Only

```bash
cd server
docker build -t quizmaster-server .
docker run -d \
  --name quizmaster-server \
  -p 3001:3001 \
  -e JWT_SECRET=your_secret \
  -e GEMINI_API_KEY=your_key \
  -v quizmaster-data:/app/data \
  -v quizmaster-uploads:/app/uploads \
  quizmaster-server
```

### Deploy Client Only

```bash
cd client
docker build -t quizmaster-client --build-arg VITE_API_URL=http://localhost:3001 .
docker run -d \
  --name quizmaster-client \
  -p 80:80 \
  quizmaster-client
```

## 📦 Volumes

The following volumes are created to persist data:

- `server-data`: SQLite database
- `server-uploads`: User uploaded files
- `server-cache`: Application cache

### Backup Data

```bash
# Backup database
docker run --rm -v quizmaster_server-data:/data -v $(pwd):/backup alpine tar czf /backup/database-backup.tar.gz -C /data .

# Backup uploads
docker run --rm -v quizmaster_server-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### Restore Data

```bash
# Restore database
docker run --rm -v quizmaster_server-data:/data -v $(pwd):/backup alpine tar xzf /backup/database-backup.tar.gz -C /data

# Restore uploads
docker run --rm -v quizmaster_server-uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## 🔍 Health Checks

Both containers include health checks:

```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' quizmaster-server | jq
docker inspect --format='{{json .State.Health}}' quizmaster-client | jq
```

## 🛠️ Development

### Rebuild Containers

After making code changes:

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build server
docker-compose up -d --build client
```

### Execute Commands in Container

```bash
# Access server shell
docker-compose exec server sh

# Access client shell
docker-compose exec client sh

# Run database migrations
docker-compose exec server npm run migrate
```

## 🌐 Production Deployment

### Environment Variables

For production, update the following in your `.env` file or docker-compose.yml:

```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
CLIENT_URL=https://yourdomain.com
GEMINI_API_KEY=<your-api-key>
LOG_LEVEL=warn
```

### Using a Reverse Proxy

For production, use a reverse proxy like Nginx or Traefik:

```nginx
# Example Nginx configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs server
docker-compose logs client

# Check if ports are already in use
lsof -i :80
lsof -i :3001
```

### Database Issues

```bash
# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d
```

### Network Issues

```bash
# Inspect network
docker network inspect quizmaster_quizmaster-network

# Restart networking
docker-compose down
docker-compose up -d
```

### Permission Issues

```bash
# Fix volume permissions
docker-compose exec server chown -R node:node /app/data /app/uploads /app/cache
```

## 📊 Monitoring

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats quizmaster-server quizmaster-client
```

### Disk Usage

```bash
# Check volume sizes
docker system df -v

# Clean up unused resources
docker system prune -a
```

## 🔄 Updates

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build server
```

## 📝 Notes

- The client is served by Nginx in production mode
- The server runs in production mode with optimized settings
- All data is persisted in Docker volumes
- Health checks ensure containers are running properly
- Both containers restart automatically unless stopped manually

## 🆘 Support

For issues or questions, please refer to the main [README.md](./README.md) or open an issue on GitHub.
