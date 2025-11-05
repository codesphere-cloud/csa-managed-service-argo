FROM node:22.21.1-alpine@sha256:b2358485e3e33bc3a33114d2b1bdb18cdbe4df01bd2b257198eb51beb1f026c5 AS base

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

RUN addgroup \
    --gid "1001" \
    appgroup \
&& adduser \
    --ingroup appgroup \
    --home "$(pwd)" \
    --disabled-password \
    --no-create-home \
    --uid "1001" \
    appuser
USER 1001

CMD ["node", "dist/src/index.js"]
