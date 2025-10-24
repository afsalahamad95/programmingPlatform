FROM GOLANG:1.25-alpine AS BUILDER

ENV USER=appuser
ENV UID=10001 

RUN adduser \    
    --disabled-password \    
    --gecos "" \    
    --home "/nonexistent" \    
    --shell "/sbin/nologin" \    
    --no-create-home \    
    --uid "${UID}" \    
    "${USER}"

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

# COPY binaries after building them

USER appuser:appuser

EXPOSE 8080