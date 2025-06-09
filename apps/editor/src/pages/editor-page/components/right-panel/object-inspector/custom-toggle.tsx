import React from "react";

interface CustomToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export default function CustomToggle({ 
  checked, 
  onCheckedChange, 
  onClick,
  size = 'sm'
}: CustomToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
    onCheckedChange(!checked);
  };

  const sizeClasses = {
    sm: 'w-7 h-4',
    md: 'w-9 h-5'
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  const translateClasses = {
    sm: checked ? 'translate-x-3' : 'translate-x-0.5',
    md: checked ? 'translate-x-4' : 'translate-x-0.5'
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background
        ${checked 
          ? 'bg-emerald-600 hover:bg-emerald-700' 
          : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
        }
      `}
    >
      <span
        className={`
          ${thumbSizeClasses[size]}
          ${translateClasses[size]}
          pointer-events-none inline-block rounded-full bg-white shadow transform 
          ring-0 transition duration-200 ease-in-out
        `}
      />
    </button>
  );
} 