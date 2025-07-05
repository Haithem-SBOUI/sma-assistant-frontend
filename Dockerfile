# Single-stage build with Node.js
FROM node:22.16.0-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build -- --base-href=/

# Install a simple HTTP server
RUN npm install -g http-server

# Expose port
EXPOSE 4200

# Start the application
CMD ["http-server", "dist/sma-assistant-frontend", "-p", "4200", "-a", "0.0.0.0"]
