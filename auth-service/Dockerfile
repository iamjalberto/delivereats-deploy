FROM node:18-alpine

# Install PostgreSQL
RUN apk add --no-cache postgresql postgresql-client su-exec

# Create postgres data directory
RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 50051
CMD ["sh", "entrypoint.sh"]
