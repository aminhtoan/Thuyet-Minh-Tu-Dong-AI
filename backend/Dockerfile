FROM node:22-slim

# Install ffmpeg for audio and video narration pipeline
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files and install
COPY package*.json ./
RUN npm install

# Copy source code and compile TypeScript
COPY . .
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["npm", "start"]
