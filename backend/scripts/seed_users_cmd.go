package main

import (
	"log"
	"qms-backend/scripts/seedusers"
)

func main() {
	log.Println("Starting user seeding process...")
	seedusers.SeedInitialUsers()
	log.Println("User seeding process completed.")
}
