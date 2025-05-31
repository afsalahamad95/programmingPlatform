package handlers

import (
	"fmt"
	"sync"

	"github.com/gofiber/websocket/v2"
)

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.Mutex
}

// Client represents a connected WebSocket client
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// NewHub creates a new hub instance
func NewHub() *Hub {
	fmt.Println("Creating new WebSocket hub...")
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's event loop
func (h *Hub) Run() {
	fmt.Println("Starting WebSocket hub event loop...")
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			fmt.Printf("New client registered. Total clients: %d\n", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				fmt.Printf("Client unregistered. Remaining clients: %d\n", len(h.clients))
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			clientCount := len(h.clients)
			fmt.Printf("Broadcasting message to %d clients\n", clientCount)
			for client := range h.clients {
				select {
				case client.send <- message:
					fmt.Printf("Message sent to client %s\n", client.conn.RemoteAddr().String())
				default:
					fmt.Printf("Failed to send message to client %s\n", client.conn.RemoteAddr().String())
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// ServeWs handles websocket requests from clients
func ServeWs(hub *Hub, c *websocket.Conn) {
	fmt.Printf("New WebSocket connection from %s\n", c.RemoteAddr().String())

	client := &Client{
		hub:  hub,
		conn: c,
		send: make(chan []byte, 256),
	}
	client.hub.register <- client

	// Start goroutine to read messages from client
	go func() {
		defer func() {
			fmt.Printf("Client %s disconnected\n", c.RemoteAddr().String())
			client.hub.unregister <- client
			c.Close()
		}()

		for {
			messageType, message, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Printf("WebSocket error from %s: %v\n", c.RemoteAddr().String(), err)
				}
				break
			}

			fmt.Printf("Received message from %s: %s\n", c.RemoteAddr().String(), string(message))

			// Echo the message back to the client
			if err := c.WriteMessage(messageType, message); err != nil {
				fmt.Printf("Error writing message to %s: %v\n", c.RemoteAddr().String(), err)
				break
			}
		}
	}()

	// Start goroutine to write messages to client
	go func() {
		defer func() {
			fmt.Printf("Stopping message writer for %s\n", c.RemoteAddr().String())
			c.Close()
		}()

		for {
			select {
			case message, ok := <-client.send:
				if !ok {
					fmt.Printf("Client %s send channel closed\n", c.RemoteAddr().String())
					return
				}

				if err := c.WriteMessage(websocket.TextMessage, message); err != nil {
					fmt.Printf("Error writing message to %s: %v\n", c.RemoteAddr().String(), err)
					return
				}
				fmt.Printf("Message sent to %s\n", c.RemoteAddr().String())
			}
		}
	}()
}

// BroadcastTestUpdate sends a test update to all connected clients
func (h *Hub) BroadcastTestUpdate(testID string) {
	fmt.Printf("Broadcasting test update for test ID: %s\n", testID)
	message := fmt.Sprintf(`{"type":"test_update","testId":"%s"}`, testID)
	h.broadcast <- []byte(message)
}
