dependencies:
	go mod download

test:
	go test ./... -tags testing

coverage:
	go test ./... -tags testing -v -coverprofile=coverage.out

all: dependencies