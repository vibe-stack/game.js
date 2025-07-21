import { UITheme, UILayout } from "./types";

// Pre-built themes
export const DEFAULT_THEME: UITheme = {
  name: "default",
  colors: {
    primary: "#3b82f6",
    secondary: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
  },
  fonts: {
    primary: "system-ui, -apple-system, sans-serif",
    mono: "Consolas, Monaco, 'Courier New', monospace",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  breakpoints: [
    { name: "sm", minWidth: 640 },
    { name: "md", minWidth: 768 },
    { name: "lg", minWidth: 1024 },
    { name: "xl", minWidth: 1280 },
  ],
};

export const DARK_THEME: UITheme = {
  ...DEFAULT_THEME,
  name: "dark",
  colors: {
    primary: "#60a5fa",
    secondary: "#94a3b8",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
  },
};

// Pre-built layouts
export const FLEX_LAYOUTS = {
  ROW: { type: "flex", direction: "row" } as UILayout,
  COLUMN: { type: "flex", direction: "column" } as UILayout,
  ROW_CENTER: { 
    type: "flex", 
    direction: "row", 
    justify: "center", 
    align: "center" 
  } as UILayout,
  COLUMN_CENTER: { 
    type: "flex", 
    direction: "column", 
    justify: "center", 
    align: "center" 
  } as UILayout,
  SPACE_BETWEEN: { 
    type: "flex", 
    direction: "row", 
    justify: "space-between",
    align: "center"
  } as UILayout,
  SPACE_AROUND: { 
    type: "flex", 
    direction: "row", 
    justify: "space-around",
    align: "center"
  } as UILayout,
};

// CSS utility functions
export function createCSSClass(name: string, styles: Record<string, string>): void {
  const styleSheet = document.styleSheets[0] || document.createElement('style');
  if (!document.head.contains(styleSheet as any)) {
    document.head.appendChild(styleSheet as any);
  }
  
  const cssText = Object.entries(styles)
    .map(([property, value]) => `${property.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
    .join(' ');
    
  (styleSheet as CSSStyleSheet).insertRule(`.${name} { ${cssText} }`);
}

// Common UI component styles
export const UI_COMPONENT_STYLES = {
  NOTIFICATION: {
    position: 'relative',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    transition: 'all 0.2s ease',
  },
  TOOLTIP: {
    position: 'relative',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    fontSize: '12px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
    zIndex: '9999',
  },
  HUD_ELEMENT: {
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    userSelect: 'none',
  },
  PROGRESS_BAR: {
    position: 'relative',
    width: '100px',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  PROGRESS_FILL: {
    height: '100%',
    backgroundColor: '#4ade80',
    transition: 'width 0.3s ease',
    borderRadius: '4px',
  },
};

// Initialize default UI styles
export function initializeUIStyles(): void {
  Object.entries(UI_COMPONENT_STYLES).forEach(([name, styles]) => {
    const className = name.toLowerCase().replace(/_/g, '-');
    createCSSClass(`ui-${className}`, styles);
  });
  
  // Add notification type variants
  createCSSClass('ui-notification--success', {
    backgroundColor: DEFAULT_THEME.colors.success,
    color: 'white',
  });
  
  createCSSClass('ui-notification--error', {
    backgroundColor: DEFAULT_THEME.colors.error,
    color: 'white',
  });
  
  createCSSClass('ui-notification--warning', {
    backgroundColor: DEFAULT_THEME.colors.warning,
    color: 'white',
  });
  
  createCSSClass('ui-notification--info', {
    backgroundColor: DEFAULT_THEME.colors.primary,
    color: 'white',
  });
}

// React integration helpers (placeholders for future React integration)
export interface ReactUIComponentProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// Utility for creating responsive styles
export function createResponsiveStyles(
  breakpoints: UITheme['breakpoints'],
  styles: Record<string, Record<string, string>>
): string {
  return Object.entries(styles)
    .map(([breakpoint, rules]) => {
      const bp = breakpoints.find(b => b.name === breakpoint);
      if (!bp) return '';
      
      const cssRules = Object.entries(rules)
        .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
        .join(' ');
        
      return `@media (min-width: ${bp.minWidth}px) { ${cssRules} }`;
    })
    .join(' ');
}

// Animation presets
export const ANIMATION_PRESETS = {
  FADE_IN: {
    property: 'opacity',
    from: 0,
    to: 1,
    duration: 300,
    easing: 'ease-out',
  },
  FADE_OUT: {
    property: 'opacity',
    from: 1,
    to: 0,
    duration: 300,
    easing: 'ease-in',
  },
  SLIDE_IN_UP: {
    property: 'transform',
    from: 'translateY(100%)',
    to: 'translateY(0)',
    duration: 400,
    easing: 'ease-out',
  },
  SLIDE_IN_DOWN: {
    property: 'transform',
    from: 'translateY(-100%)',
    to: 'translateY(0)',
    duration: 400,
    easing: 'ease-out',
  },
  SCALE_IN: {
    property: 'transform',
    from: 'scale(0.8)',
    to: 'scale(1)',
    duration: 200,
    easing: 'ease-out',
  },
  BOUNCE: {
    property: 'transform',
    from: 'scale(1)',
    to: 'scale(1.1)',
    duration: 150,
    easing: 'ease-in-out',
    yoyo: true,
  },
};

// Utility for creating UI component factories
export function createUIComponentFactory<T extends Record<string, any>>(
  defaultConfig: T,
  createElement: (config: T) => any
) {
  return (config: Partial<T> = {}) => {
    return createElement({ ...defaultConfig, ...config });
  };
}
