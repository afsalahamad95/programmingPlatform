package main

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	po := "682dae41da3c64df6dfd6a43"
	objectID, err := primitive.ObjectIDFromHex(po)
	if err != nil {
		panic(err)
	}
	fmt.Println(objectID)
	h := objectID.Hex()
	fmt.Println(h)
}
