# Docker Development Environment

This repository includes a Docker-based development environment that provides a consistent setup across different machines and operating systems.

## Files

- `Dockerfile.dev` - Docker container definition for development
- `.dockerignore` - Files to exclude from Docker build context

## Quick Start

### With Cursor

If using Cursor IDE, the environment will automatically use this Docker setup when you start a Background Agent. The configuration is in `.cursor/environment.json`.

### Local Development

To run the Docker environment locally:

```bash
# Build the Docker image
docker build -f Dockerfile.dev -t alchemy-dev .

# Run the container with code mounted
docker run -it -p 3000:3000 -v $(pwd):/workspace alchemy-dev

# Inside the container, start the dev server
cd /workspace/examples/cloudflare-tanstack-start && bun run dev
```

## What's Included

- **Ubuntu 22.04** base image
- **Bun** JavaScript runtime (latest)
- All project dependencies pre-installed
- Port 3000 exposed for the development server

## Docker Build Optimization

The Dockerfile is optimized for caching:

1. System packages are installed first
2. Bun runtime is installed next
3. Package files are copied before source code
4. Dependencies are installed before copying the full codebase

This means that changes to source code won't require reinstalling dependencies.

## Environment Variables

If you need AWS credentials or other secrets in the container, you can:

1. Pass them as build args:

   ```bash
   docker build --build-arg AWS_ACCESS_KEY_ID=xxx -f Dockerfile.dev -t alchemy-dev .
   ```

2. Or mount a `.env` file:
   ```bash
   docker run -it -p 3000:3000 -v $(pwd):/workspace -v $(pwd)/.env:/workspace/.env alchemy-dev
   ```

## Troubleshooting

If you encounter issues:

1. Ensure Docker is installed and running
2. Check that port 3000 is not already in use
3. Make sure you have enough disk space for the Docker image
4. Try rebuilding without cache: `docker build --no-cache -f Dockerfile.dev -t alchemy-dev .`
