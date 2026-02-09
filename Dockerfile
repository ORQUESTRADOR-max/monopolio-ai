# --- Stage 1: Build Frontend ---
FROM node:18-alpine AS frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# --- Stage 2: Setup Backend ---
FROM node:18-alpine
WORKDIR /app

# Backend Deps
COPY package*.json ./
RUN npm install --production

# Backend Code
COPY server.js ./

# Copia Frontend compilado do Stage 1
COPY --from=frontend /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server.js"]
