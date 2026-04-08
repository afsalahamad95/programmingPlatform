import React, { useEffect, useState } from "react";
import { useQueryClient } from "react-query";
import { WebSocketContext } from "./WebSocketContext";

interface WebSocketProviderProps {
	children: React.ReactNode;
}

const MAX_RECONNECT_ATTEMPTS = 10;

export function WebSocketProvider({ children }: WebSocketProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [connectionAttempts, setConnectionAttempts] = useState(0);
	const queryClient = useQueryClient();
	const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (connectionAttempts > MAX_RECONNECT_ATTEMPTS) {
			console.warn("WebSocket: max reconnect attempts reached, giving up");
			return;
		}

		const wsUrl = `ws://localhost:8080/ws`;
		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			setIsConnected(true);
			setConnectionAttempts(0);
		};

		ws.onclose = () => {
			setIsConnected(false);
			// Exponential backoff: 2s, 4s, 8s … up to 30s
			const delay = Math.min(2000 * Math.pow(2, connectionAttempts), 30000);
			reconnectTimerRef.current = setTimeout(() => {
				setConnectionAttempts((prev) => prev + 1);
				setSocket(null);
			}, delay);
		};

		ws.onerror = () => {
			setIsConnected(false);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "test_update") {
					queryClient.invalidateQueries("activeTests");
					queryClient.invalidateQueries("scheduledTests");
					queryClient.invalidateQueries("tests");
				} else if (data.type === "challenge_update") {
					queryClient.invalidateQueries("challenges");
				} else if (data.type === "results_update") {
					queryClient.invalidateQueries("myResults");
				}
			} catch {
				// ignore parse errors
			}
		};

		setSocket(ws);

		return () => {
			if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
			ws.close();
		};
	}, [queryClient, connectionAttempts]);

	return (
		<WebSocketContext.Provider value={{ isConnected }}>
			{children}
		</WebSocketContext.Provider>
	);
}
