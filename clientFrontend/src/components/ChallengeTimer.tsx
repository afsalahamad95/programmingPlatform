import React, { useState, useEffect, useCallback, useRef } from "react";

interface ChallengeTimerProps {
	timeLimit: number; // in minutes
	onTimeExpired: () => void;
	onTimeUpdate?: (timeSpent: number) => void; // in seconds
}

const ChallengeTimer: React.FC<ChallengeTimerProps> = ({
	timeLimit,
	onTimeExpired,
	onTimeUpdate,
}) => {
	const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit * 60); // convert to seconds
	const [isWarning, setIsWarning] = useState<boolean>(false);
	const [isAlmostExpired, setIsAlmostExpired] = useState<boolean>(false);
	const timerRef = useRef<number | null>(null);

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	const calculateTimeSpent = useCallback((): number => {
		return timeLimit * 60 - timeRemaining;
	}, [timeLimit, timeRemaining]);

	// Handle time updates
	useEffect(() => {
		if (onTimeUpdate) {
			onTimeUpdate(calculateTimeSpent());
		}
	}, [timeRemaining, calculateTimeSpent, onTimeUpdate]);

	// Check for warning thresholds
	useEffect(() => {
		// Set warning state when less than 20% time remaining
		if (timeRemaining <= timeLimit * 60 * 0.2) {
			setIsAlmostExpired(true);
		}
		// Set warning state when less than 50% time remaining
		else if (timeRemaining <= timeLimit * 60 * 0.5) {
			setIsWarning(true);
		}
	}, [timeRemaining, timeLimit]);

	// Timer effect
	useEffect(() => {
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

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [timeLimit, onTimeExpired]);

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
