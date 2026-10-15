import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-charcoal-900 text-white hover:bg-charcoal-800 focus:ring-charcoal-900 shadow-sm active:translate-y-px',
    gold:
      'bg-gold-500 text-charcoal-950 hover:bg-gold-600 focus:ring-gold-500 font-semibold shadow-sm active:translate-y-px',
    secondary:
      'bg-charcoal-100 text-charcoal-800 hover:bg-charcoal-200 focus:ring-charcoal-400 active:translate-y-px',
    outline:
      'border border-charcoal-300 bg-white text-charcoal-700 hover:bg-charcoal-50 focus:ring-charcoal-400 active:translate-y-px',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 active:translate-y-px',
    ghost:
      'bg-transparent text-charcoal-600 hover:bg-charcoal-100 hover:text-charcoal-900 focus:ring-charcoal-300',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
};
