import { ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger";
	icon?: LucideIcon;
}

export default function Button({
	variant = "primary",
	icon: Icon,
	children,
	className = "",
	...props
}: ButtonProps) {
	const baseStyles =
		"inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";

	const variants = {
		primary:
			"text-white glass-button-primary focus:ring-indigo-500",
		secondary:
			"text-gray-200 bg-white border border-white/20 hover:bg-white/5 focus:ring-indigo-500",
		danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
	};

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${className}`}
			{...props}
		>
			{Icon && <Icon className="h-5 w-5 mr-2" />}
			{children}
		</button>
	);
}
