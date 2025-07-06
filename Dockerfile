# Development Dockerfile for Angular 19
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Expose port 4200
EXPOSE 4200

# Start the Angular development server
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]