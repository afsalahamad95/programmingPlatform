import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 3,
			staleTime: 5 * 60 * 1000, // 5 minutes
			onError: (error: any) => {
				console.error("Query error:", error);
			},
		},
		mutations: {
			retry: 2,
			onError: (error: any) => {
				console.error("Mutation error:", error);
			},
		},
	},
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<QueryClientProvider client={queryClient}>
				<App />
				<Toaster position="top-right" />
			</QueryClientProvider>
		</BrowserRouter>
	</StrictMode>
);
