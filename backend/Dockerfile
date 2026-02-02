# Use official Node.js 22 LTS as base image
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This ensures npm install runs only when dependencies change
COPY package*.json ./

# Install dependencies (only production dependencies to keep image small)
# Using npm ci for cleaner, deterministic installs in CI/CD environments
# If you need dev dependencies for building (like typescript), remove --only=production
RUN npm ci

# Copy the rest of the application code
COPY . .

# Create uploads directory if it doesn't exist (for file uploads)
RUN mkdir -p uploads/pdfs

# Expose the port the app runs on
EXPOSE 5000

# Define environment variables with default values (can be overridden at runtime)
ENV PORT=5000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
