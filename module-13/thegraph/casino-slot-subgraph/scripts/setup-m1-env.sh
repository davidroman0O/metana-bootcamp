#!/bin/bash

# Setup script for M1 MacBook Pro development environment
# This script sets up the necessary components for running TheGraph + Hardhat on M1

set -e

echo "🔧 Setting up M1 MacBook Pro development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on M1 Mac
if [[ $(uname -m) != "arm64" ]]; then
    echo -e "${YELLOW}Warning: This script is designed for M1 MacBook Pro (arm64). Current architecture: $(uname -m)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop for Mac first.${NC}"
    echo "Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Check Docker memory allocation
echo "🔍 Checking Docker memory allocation..."
DOCKER_MEMORY=$(docker system info --format '{{.MemTotal}}' 2>/dev/null || echo "0")
if [ "$DOCKER_MEMORY" -lt 8000000000 ]; then
    echo -e "${YELLOW}⚠️  Docker memory might be insufficient for Graph Node compilation.${NC}"
    echo "Please increase Docker memory allocation:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings → Resources → Advanced"
    echo "3. Set Memory to at least 8GB"
    echo "4. Click 'Apply & Restart'"
    echo ""
    read -p "Have you increased Docker memory allocation? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Please increase Docker memory allocation before continuing.${NC}"
        exit 1
    fi
fi

# Check if we have the graph-node-master directory
GRAPH_NODE_DIR="../graph-node-master"
if [ ! -d "$GRAPH_NODE_DIR" ]; then
    echo -e "${RED}❌ Graph Node source directory not found: $GRAPH_NODE_DIR${NC}"
    echo "Please ensure the graph-node-master directory exists in the thegraph folder."
    exit 1
fi

# Build the M1-compatible graph-node image
echo "🏗️  Building M1-compatible graph-node image..."
echo "This may take 10-20 minutes on first run..."

cd "$GRAPH_NODE_DIR"

# Remove existing image if it exists
if docker image inspect graphprotocol/graph-node:latest &> /dev/null; then
    echo "🗑️  Removing existing graph-node image..."
    docker rmi graphprotocol/graph-node:latest
fi

# Build the image
echo "🔨 Building graph-node for M1..."
if ./docker/build.sh; then
    echo "✅ Graph Node build completed successfully"
else
    echo -e "${RED}❌ Graph Node build failed${NC}"
    exit 1
fi

# Tag the image
echo "🏷️  Tagging the image..."
if docker tag graph-node graphprotocol/graph-node:latest; then
    echo "✅ Image tagged successfully"
else
    echo -e "${RED}❌ Failed to tag image${NC}"
    exit 1
fi

# Return to the original directory
cd - > /dev/null

# Check if we have the necessary files
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found in current directory${NC}"
    exit 1
fi

# Create data directories if they don't exist
echo "📁 Creating data directories..."
mkdir -p data/ipfs data/postgres

# Set proper permissions for data directories
chmod 755 data/ipfs data/postgres

echo -e "${GREEN}✅ M1 environment setup completed successfully!${NC}"
echo ""
echo "🎉 You can now run the development environment with:"
echo "   make dev-full"
echo ""
echo "📝 Available commands:"
echo "   make dev-full        - Start complete development environment"
echo "   make build-m1        - Rebuild graph-node for M1 (if needed)"
echo "   make refresh-all     - Refresh contracts and subgraph"
echo "   make logs           - View service logs"
echo "   make stop-node      - Stop all services"
echo ""
echo "🌐 Once running, access:"
echo "   • GraphiQL: http://localhost:8000"
echo "   • Graph Admin: http://localhost:8020"
echo "   • IPFS: http://localhost:5001"
echo "   • Hardhat Node: http://localhost:8545"