FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Railway persistent data directory must be writable by the non-root runtime user.
RUN mkdir -p /app/data && chown -R node:node /app

USER node
CMD ["node", "server.js"]
