FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN apk add --no-cache libstdc++

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:seed

EXPOSE 3001
CMD ["npm", "start"]
