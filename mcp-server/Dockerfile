# Stage 1: Builder — clone and build the official Grafana MCP server binary
FROM golang:1.24-alpine AS builder

ARG VERSION=latest
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Clone the official Grafana MCP server
RUN git clone --depth 1 https://github.com/grafana/mcp-grafana.git .

# Download dependencies
RUN go mod download

# Build the binary with version info
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s \
      -X main.version=${VERSION} \
      -X main.gitCommit=${GIT_COMMIT} \
      -X main.buildDate=${BUILD_DATE}" \
    -a -installsuffix cgo \
    -o /mcp-grafana \
    ./cmd/mcp-grafana/...

# Stage 2: Runtime — distroless for minimal attack surface
FROM gcr.io/distroless/static-debian12:nonroot

# OCI image labels
LABEL org.opencontainers.image.title="grafana-mcp-server" \
      org.opencontainers.image.description="Official Grafana MCP Server - production build" \
      org.opencontainers.image.source="https://github.com/grafana/mcp-grafana" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="Apache-2.0"

# Copy binary and CA certs from builder
COPY --from=builder /mcp-grafana /mcp-grafana
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Run as non-root (UID 65534 = nobody in distroless)
USER 65534:65534

# MCP SSE transport port
EXPOSE 8080
# Health check port (separate)
EXPOSE 8081

# Environment variable defaults (overridden via ConfigMap/ExternalSecret)
ENV MCP_LOG_LEVEL=info \
    TRANSPORT=sse \
    PORT=8080

ENTRYPOINT ["/mcp-grafana"]
CMD ["-transport", "sse", "-address", "0.0.0.0:8080"]
