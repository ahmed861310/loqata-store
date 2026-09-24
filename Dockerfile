
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

USER root
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
