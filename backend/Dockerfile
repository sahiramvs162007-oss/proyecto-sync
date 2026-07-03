FROM node:20-alpine

WORKDIR /app

# Instala dependencias primero (aprovecha la cache de Docker)
COPY package*.json ./
RUN npm install --omit=dev

# Copia el resto del código
COPY . .

# Script de arranque: espera a MySQL, migra, siembra y levanta el server
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
