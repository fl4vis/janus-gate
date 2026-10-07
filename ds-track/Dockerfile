# -------------------------
# Build React
# -------------------------
FROM node:22-alpine AS frontend

WORKDIR /src/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build


# -------------------------
# Build Go
# -------------------------
FROM golang:1.25-alpine AS backend

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./

# Go embed needs web/dist available at compile time
COPY --from=frontend /src/web/dist ./web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -o /app .


# -------------------------
# Runtime
# -------------------------
FROM alpine:3.22

RUN apk add --no-cache tzdata \
    && adduser -D -u 10001 appuser \
    && mkdir /data \
    && chown appuser:appuser /data

COPY --from=backend /app /usr/local/bin/app

USER appuser
WORKDIR /data

EXPOSE 4040

CMD ["/usr/local/bin/app"]

LABEL org.opencontainers.image.source=https://github.com/fl4vis/janus-gate
