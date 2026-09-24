FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
