import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200",
    secondary: "bg-amber-400 hover:bg-amber-300 text-amber-900 shadow-amber-200",
    outline: "border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50",
    danger: "bg-red-500 hover:bg-red-400 text-white shadow-red-200"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <>Processing...</> : children}
    </button>
  );
};