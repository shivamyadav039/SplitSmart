# --- Stage 1: Build the Vite React Frontend ---
FROM node:18-alpine AS client-builder
WORKDIR /app

# Install client dependencies
COPY client/package*.json ./client/
RUN npm install --prefix client

# Copy client source and build
COPY client/ ./client/
RUN npm run build --prefix client

# --- Stage 2: Run the Node.js Express Server ---
FROM node:18-alpine AS server-runner
WORKDIR /app
ENV NODE_ENV=production

# Install server production dependencies
COPY server/package*.json ./server/
RUN npm install --prefix server --only=production

# Copy server source
COPY server/ ./server/

# Copy root package.json for starting scripts
COPY package*.json ./

# Copy built frontend from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (Render/Railway will bind to this)
EXPOSE 5000

# Start server (runs database migration and starts Express)
CMD ["npm", "run", "start"]
