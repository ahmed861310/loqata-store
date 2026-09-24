FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

USER root
RUN mkdir -p /var/data && chown -R node:node /var/data

USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
