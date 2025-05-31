import { createContext } from "react";

export interface WebSocketContextType {
	isConnected: boolean;
}

const defaultContext: WebSocketContextType = {
	isConnected: false,
};

export const WebSocketContext =
	createContext<WebSocketContextType>(defaultContext);
