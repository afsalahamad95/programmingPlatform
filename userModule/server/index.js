import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/index.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Enhanced CORS configuration
app.use(
	cors({
		origin: [
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:5175",
		], // Vite's possible ports
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.use(express.json());
app.use(morgan("dev"));

// Health check endpoint
app.get("/health", (req, res) => {
	const dbStatus =
		mongoose.connection.readyState === 1 ? "connected" : "disconnected";
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
		database: dbStatus,
	});
});

// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
	try {
		await connectDB();

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
			console.log(`API is available at http://localhost:${PORT}/api`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
};

startServer();
