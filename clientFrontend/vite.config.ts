import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		exclude: ["lucide-react"],
		include: ["@monaco-editor/react"],
	},
	build: {
		chunkSizeWarningLimit: 2000, // Monaco editor is large
		rollupOptions: {
			output: {
				manualChunks: {
					monaco: ["monaco-editor"],
				},
			},
		},
	},
	server: {
		port: 5173,
		fs: {
			// Allow serving files from node_modules for Monaco editor
			allow: [".."],
		},
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
				ws: true, // Enable WebSocket proxying
				configure: (proxy, _options) => {
					proxy.on("error", (err, _req, _res) => {
						console.log("proxy error", err);
					});
					proxy.on("proxyReq", (_proxyReq, req, _res) => {
						console.log(
							"Sending Request to the Target:",
							req.method,
							req.url
						);
					});
					proxy.on("proxyRes", (proxyRes, req, _res) => {
						console.log(
							"Received Response from the Target:",
							proxyRes.statusCode,
							req.url
						);
					});
				},
			},
		},
	},
});
