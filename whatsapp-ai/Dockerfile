FROM node:18-alpine

# Install build dependencies if needed (e.g. for some canvas or native node modules, though none are active now)
# RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Expose server port
EXPOSE 3000

CMD ["npm", "start"]
