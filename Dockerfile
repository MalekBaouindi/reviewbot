FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
RUN addgroup --system reviewbot && adduser --system --ingroup reviewbot reviewbot && \
    chown -R reviewbot:reviewbot /app
USER reviewbot
EXPOSE 3000
CMD ["node", "dist/index.js"]
