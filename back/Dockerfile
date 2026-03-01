FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN apk add --no-cache wget && \
    wget -q https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata && \
    wget -q https://github.com/tesseract-ocr/tessdata/raw/main/fra.traineddata

EXPOSE 3001

CMD ["node", "dist/main"]
