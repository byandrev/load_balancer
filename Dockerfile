FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

#Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json .

COPY . .

RUN npm install

EXPOSE 4010

CMD ["node", "index.js"]