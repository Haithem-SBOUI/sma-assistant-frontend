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

# Install serve - a better static file server
RUN npm install -g serve

# Expose port
EXPOSE 4200

# Start the application
CMD ["serve", "-s", "dist/sma-assistant-frontend", "-l", "4200"]
