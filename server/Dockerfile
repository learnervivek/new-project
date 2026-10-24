FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src/ ./src/

# Expose default port
EXPOSE 5001

ENV NODE_ENV=production
ENV PORT=5001

CMD ["node", "src/server.js"]
