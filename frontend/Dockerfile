# Stage 1: Build the Angular application
FROM node:22-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps



# Copy the rest of the application code
COPY . .

ENV NODE_OPTIONS=--max-old-space-size=512
# Build the application for production
# Adjust the output path if it's different in your angular.json
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the previous stage
# Note: The path 'dist/inventory-management' matches the outputPath in angular.json
COPY --from=build /app/dist/inventory-management /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
