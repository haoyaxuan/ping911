# syntax=docker/dockerfile:1

FROM golang:1.24-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/ping911 \
    .

FROM alpine:3.21

RUN apk add --no-cache ca-certificates iputils

WORKDIR /app

COPY --from=builder /out/ping911 ./ping911
COPY config/config.example.yaml ./config/config.yaml

EXPOSE 9110

ENTRYPOINT ["./ping911"]
