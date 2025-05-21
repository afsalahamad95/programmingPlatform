import React, { useState, useEffect, useCallback, useRef } from "react";

interface ChallengeTimerProps {
	timeLimit: number; // in minutes
	onTimeExpired: () => void;
	onTimeUpdate?: (timeSpent: number) => void; // in seconds
	challengeId: string; // Add challenge ID to identify timers for different challenges
}

const ChallengeTimer: React.FC<ChallengeTimerProps> = ({
	timeLimit,
	onTimeExpired,
	onTimeUpdate,
	challengeId,
}) => {
	const timerRef = useRef<number | null>(null);
	const timerLimitInSeconds = timeLimit * 60;

	// Initialize timer state from localStorage or defaults
	const [timeRemaining, setTimeRemaining] = useState<number>(() => {
		try {
			const timerKey = `challenge_timer_${challengeId}`;
			const timerData = localStorage.getItem(timerKey);

			if (timerData) {
				const { startTime, timeLimitInSeconds } = JSON.parse(timerData);
				const now = Date.now();
				const elapsedSeconds = Math.floor((now - startTime) / 1000);
				const remainingTime = Math.max(
					0,
					timeLimitInSeconds - elapsedSeconds
				);

				// If time already expired, trigger expiry callback
				if (remainingTime <= 0) {
					setTimeout(() => onTimeExpired(), 0);
					return 0;
				}

				return remainingTime;
			}

			// No timer found in localStorage, initialize a new one
			const newTimerData = {
				startTime: Date.now(),
				timeLimitInSeconds: timerLimitInSeconds,
			};
			localStorage.setItem(timerKey, JSON.stringify(newTimerData));
			return timerLimitInSeconds;
		} catch (error) {
			console.error("Error initializing timer:", error);
			return timerLimitInSeconds;
		}
	});

	const [isWarning, setIsWarning] = useState<boolean>(false);
	const [isAlmostExpired, setIsAlmostExpired] = useState<boolean>(false);

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	const calculateTimeSpent = useCallback((): number => {
		return timerLimitInSeconds - timeRemaining;
	}, [timerLimitInSeconds, timeRemaining]);

	// Handle time updates
	useEffect(() => {
		if (onTimeUpdate) {
			onTimeUpdate(calculateTimeSpent());
		}
	}, [timeRemaining, calculateTimeSpent, onTimeUpdate]);

	// Check for warning thresholds
	useEffect(() => {
		// Set warning state when less than 20% time remaining
		if (timeRemaining <= timerLimitInSeconds * 0.2) {
			setIsAlmostExpired(true);
		}
		// Set warning state when less than 50% time remaining
		else if (timeRemaining <= timerLimitInSeconds * 0.5) {
			setIsWarning(true);
		}
	}, [timeRemaining, timerLimitInSeconds]);

	// Timer effect
	useEffect(() => {
		// Only start the timer if there's time remaining
		if (timeRemaining > 0) {
			timerRef.current = window.setInterval(() => {
				setTimeRemaining((prev) => {
					if (prev <= 1) {
						if (timerRef.current) {
							clearInterval(timerRef.current);
						}
						onTimeExpired();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [timeRemaining, onTimeExpired]);

	const getTimerClasses = () => {
		if (isAlmostExpired) {
			return "bg-red-100 text-red-800 font-bold animate-pulse";
		}
		if (isWarning) {
			return "bg-yellow-100 text-yellow-800 font-semibold";
		}
		return "bg-green-100 text-green-800";
	};

	return (
		<div className="flex items-center justify-center">
			<div className={`px-4 py-2 rounded-md ${getTimerClasses()}`}>
				<span className="text-lg">
					Time Remaining: {formatTime(timeRemaining)}
				</span>
			</div>
		</div>
	);
};

export default ChallengeTimer;
