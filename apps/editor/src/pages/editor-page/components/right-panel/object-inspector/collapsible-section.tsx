import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = false,
  children,
  rightElement,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(`inspector-section-${storageKey}`);
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, [storageKey]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(
      `inspector-section-${storageKey}`,
      newState.toString(),
    );
  };

  return (
    <div className="border-border/30 border-b last:border-b-0">
      <div
        onClick={handleToggle}
        className="hover:bg-muted/20 group flex w-full items-center justify-between px-3 py-2.5 transition-colors cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          <span className="text-foreground text-xs font-medium">{title}</span>
        </div>
        {rightElement}
      </div>

      {isOpen && <div className="px-3 pt-1 pb-3">{children}</div>}
    </div>
  );
}
