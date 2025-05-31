import React, { useEffect, useState } from "react";
import { useQueryClient } from "react-query";
import { WebSocketContext } from "./WebSocketContext";

interface WebSocketProviderProps {
	children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [connectionAttempts, setConnectionAttempts] = useState(0);
	const queryClient = useQueryClient();

	useEffect(() => {
		console.log("WebSocket Provider mounted");
		console.log("Attempting to connect to WebSocket...");

		// Try both localhost and window.location.hostname
		const wsUrl = `ws://localhost:3000/ws`;
		console.log("Connecting to:", wsUrl);

		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log("WebSocket connected successfully");
			console.log("WebSocket readyState:", ws.readyState);
			setIsConnected(true);
			setConnectionAttempts(0);
		};

		ws.onclose = (event) => {
			console.log("WebSocket disconnected:", {
				code: event.code,
				reason: event.reason,
				wasClean: event.wasClean,
				readyState: ws.readyState,
			});
			setIsConnected(false);

			// Attempt to reconnect after 5 seconds
			console.log("Will attempt to reconnect in 5 seconds...");
			setTimeout(() => {
				console.log("Attempting to reconnect...");
				setConnectionAttempts((prev) => prev + 1);
				setSocket(null);
			}, 5000);
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			console.log("WebSocket state:", {
				readyState: ws.readyState,
				url: ws.url,
				bufferedAmount: ws.bufferedAmount,
			});
			setIsConnected(false);
		};

		ws.onmessage = (event) => {
			try {
				console.log("WebSocket message received:", event.data);
				const data = JSON.parse(event.data);
				console.log("Parsed WebSocket message:", data);

				if (data.type === "test_update") {
					console.log("Test update received, invalidating queries");
					// Invalidate and refetch tests query when a test is updated
					queryClient.invalidateQueries("tests");
				}
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		};

		setSocket(ws);

		// Cleanup on unmount
		return () => {
			if (ws) {
				console.log("Closing WebSocket connection");
				ws.close();
			}
		};
	}, [queryClient, connectionAttempts]);

	// Log connection status changes
	useEffect(() => {
		console.log("WebSocket connection status changed:", isConnected);
	}, [isConnected]);

	return (
		<WebSocketContext.Provider value={{ isConnected }}>
			{children}
		</WebSocketContext.Provider>
	);
}
