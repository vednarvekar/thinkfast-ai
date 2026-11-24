FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY eng.traineddata ./
EXPOSE 5000
CMD ["npm", "start"]
