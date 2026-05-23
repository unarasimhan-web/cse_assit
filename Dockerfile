FROM node:20-alpine

WORKDIR /app

# Copy dependency files first (layer cache optimisation)
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application files
COPY server.js ./
COPY public/ ./public/

# Cloud Run injects PORT automatically
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
