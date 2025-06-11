import {
  useId,
  useState,
  useRef,
  useCallback,
  useEffect,
  CSSProperties,
} from "react";
import {
  displacementMap,
  prominentDisplacementMap,
  polarDisplacementMap,
} from "./utils";

const getMap = (mode: "standard" | "polar" | "prominent") => {
  switch (mode) {
    case "standard":
      return displacementMap;
    case "polar":
      return polarDisplacementMap;
    case "prominent":
      return prominentDisplacementMap;
    default:
      return displacementMap;
  }
};

const GlassFilter: React.FC<{
  id: string;
  displacementScale: number;
  aberrationIntensity: number;
  width: number;
  height: number;
  mode: "standard" | "polar" | "prominent";
}> = ({ id, displacementScale, aberrationIntensity, width, height, mode }) => (
  <svg style={{ position: "absolute", width, height }} aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-edge-mask`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="black" stopOpacity="0" />
        <stop
          offset={`${Math.max(30, 80 - aberrationIntensity * 2)}%`}
          stopColor="black"
          stopOpacity="0"
        />
        <stop offset="100%" stopColor="white" stopOpacity="1" />
      </radialGradient>
      <filter
        id={id}
        x="-35%"
        y="-35%"
        width="170%"
        height="170%"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          id="feimage"
          x="0"
          y="0"
          width="100%"
          height="100%"
          result="DISPLACEMENT_MAP"
          href={getMap(mode)}
          preserveAspectRatio="xMidYMid slice"
        />

        <feColorMatrix
          in="DISPLACEMENT_MAP"
          type="matrix"
          values="0.3 0.3 0.3 0 0
                 0.3 0.3 0.3 0 0
                 0.3 0.3 0.3 0 0
                 0 0 0 1 0"
          result="EDGE_INTENSITY"
        />
        <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
          <feFuncA
            type="discrete"
            tableValues={`0 ${aberrationIntensity * 0.05} 1`}
          />
        </feComponentTransfer>

        <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

        <feDisplacementMap
          in="SourceGraphic"
          in2="DISPLACEMENT_MAP"
          scale={displacementScale * -1}
          xChannelSelector="R"
          yChannelSelector="B"
          result="RED_DISPLACED"
        />
        <feColorMatrix
          in="RED_DISPLACED"
          type="matrix"
          values="1 0 0 0 0
                 0 0 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="RED_CHANNEL"
        />

        <feDisplacementMap
          in="SourceGraphic"
          in2="DISPLACEMENT_MAP"
          scale={displacementScale * (-1 - aberrationIntensity * 0.05)}
          xChannelSelector="R"
          yChannelSelector="B"
          result="GREEN_DISPLACED"
        />
        <feColorMatrix
          in="GREEN_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 1 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="GREEN_CHANNEL"
        />

        <feDisplacementMap
          in="SourceGraphic"
          in2="DISPLACEMENT_MAP"
          scale={displacementScale * (-1 - aberrationIntensity * 0.1)}
          xChannelSelector="R"
          yChannelSelector="B"
          result="BLUE_DISPLACED"
        />
        <feColorMatrix
          in="BLUE_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 0 0 0 0
                 0 0 1 0 0
                 0 0 0 1 0"
          result="BLUE_CHANNEL"
        />

        <feBlend
          in="GREEN_CHANNEL"
          in2="BLUE_CHANNEL"
          mode="screen"
          result="GB_COMBINED"
        />
        <feBlend
          in="RED_CHANNEL"
          in2="GB_COMBINED"
          mode="screen"
          result="RGB_COMBINED"
        />

        <feGaussianBlur
          in="RGB_COMBINED"
          stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)}
          result="ABERRATED_BLURRED"
        />

        <feComposite
          in="ABERRATED_BLURRED"
          in2="EDGE_MASK"
          operator="in"
          result="EDGE_ABERRATION"
        />

        <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feComposite
          in="CENTER_ORIGINAL"
          in2="INVERTED_MASK"
          operator="in"
          result="CENTER_CLEAN"
        />

        <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
      </filter>
    </defs>
  </svg>
);

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  cornerRadius?: number;
  padding?: string;
  overLight?: boolean;
  mode?: "standard" | "polar" | "prominent";
  onClick?: () => void;
  mouseContainer?: React.RefObject<HTMLElement | null> | null;
}

export default function LiquidGlass({
  children,
  className = "",
  style = {},
  displacementScale = 70,
  blurAmount = 0.0625,
  saturation = 140,
  aberrationIntensity = 2,
  elasticity = 0.15,
  cornerRadius = 999,
  padding = "24px 32px",
  overLight = false,
  mode = "standard",
  onClick,
  mouseContainer = null,
}: LiquidGlassProps) {
  const glassRef = useRef<HTMLDivElement>(null);
  const filterId = useId();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [glassSize, setGlassSize] = useState({ width: 0, height: 0 });
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [elasticTransform, setElasticTransform] = useState({ x: 0, y: 0, scale: 1 });

  const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

  // Update glass size whenever component mounts or window resizes
  useEffect(() => {
    const updateGlassSize = () => {
      if (glassRef.current) {
        const rect = glassRef.current.getBoundingClientRect();
        setGlassSize({ width: rect.width, height: rect.height });
      }
    };

    updateGlassSize();
    const resizeObserver = new ResizeObserver(updateGlassSize);
    if (glassRef.current) {
      resizeObserver.observe(glassRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Mouse tracking
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = mouseContainer?.current || glassRef.current;
    if (!container || !glassRef.current) return;

    const glassRect = glassRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the glass element
    const glassCenterX = glassRect.left + glassRect.width / 2;
    const glassCenterY = glassRect.top + glassRect.height / 2;
    
    const deltaX = e.clientX - glassCenterX;
    const deltaY = e.clientY - glassCenterY;
    
    // Calculate mouse offset as percentage
    const offsetX = (deltaX / glassRect.width) * 100;
    const offsetY = (deltaY / glassRect.height) * 100;
    
    setMouseOffset({ x: offsetX, y: offsetY });

    // Calculate elastic effects based on distance from glass
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 200; // activation zone
    
    if (distance > maxDistance) {
      setElasticTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const intensity = (1 - distance / maxDistance) * elasticity;
    
    // Elastic translation (subtle movement toward mouse)
    const translateX = deltaX * intensity * 0.05;
    const translateY = deltaY * intensity * 0.05;
    
    // Directional scaling (stretch toward mouse)
    const normalizedX = distance > 0 ? deltaX / distance : 0;
    const normalizedY = distance > 0 ? deltaY / distance : 0;
    
    const scaleX = 1 + Math.abs(normalizedX) * intensity * 0.1;
    const scaleY = 1 + Math.abs(normalizedY) * intensity * 0.1;
    const scale = Math.min(scaleX, scaleY);
    
    setElasticTransform({ 
      x: translateX, 
      y: translateY, 
      scale: Math.max(0.95, scale) 
    });
  }, [mouseContainer, elasticity]);

  const handleMouseLeave = useCallback(() => {
    setMouseOffset({ x: 0, y: 0 });
    setElasticTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Set up mouse tracking
  useEffect(() => {
    const container = mouseContainer?.current || document;
    
    const mouseMoveHandler = (e: Event) => handleMouseMove(e as MouseEvent);
    const mouseLeaveHandler = () => handleMouseLeave();
    
    container.addEventListener("mousemove", mouseMoveHandler);
    container.addEventListener("mouseleave", mouseLeaveHandler);

    return () => {
      container.removeEventListener("mousemove", mouseMoveHandler);
      container.removeEventListener("mouseleave", mouseLeaveHandler);
    };
  }, [handleMouseMove, handleMouseLeave, mouseContainer]);

  // Calculate backdrop filter styles
  const backdropStyle: CSSProperties = {
    filter: isFirefox ? undefined : `url(#${filterId})`,
    backdropFilter: `blur(${(overLight ? 12 : 4) + blurAmount * 32}px) saturate(${saturation}%)`,
  };

  // Calculate transform for elastic effects
  const transform = `
    translate(${elasticTransform.x}px, ${elasticTransform.y}px) 
    scale(${isActive && onClick ? 0.96 : elasticTransform.scale})
  `.trim();

  // Calculate border gradient
  const borderGradient = `linear-gradient(
    ${135 + mouseOffset.x * 1.2}deg,
    rgba(255, 255, 255, 0.0) 0%,
    rgba(255, 255, 255, ${0.12 + Math.abs(mouseOffset.x) * 0.008}) ${Math.max(10, 33 + mouseOffset.y * 0.3)}%,
    rgba(255, 255, 255, ${0.4 + Math.abs(mouseOffset.x) * 0.012}) ${Math.min(90, 66 + mouseOffset.y * 0.4)}%,
    rgba(255, 255, 255, 0.0) 100%
  )`;

  return (
    <div
      ref={glassRef}
      className={`relative ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{
        ...style,
        transform,
        transition: "transform 0.2s ease-out",
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeave();
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      {/* SVG Filter */}
      <GlassFilter
        mode={mode}
        id={filterId}
        displacementScale={overLight ? displacementScale * 0.5 : displacementScale}
        aberrationIntensity={aberrationIntensity}
        width={glassSize.width}
        height={glassSize.height}
      />

      {/* Over light background effect */}
      {overLight && (
        <>
          <div 
            className="absolute inset-0 bg-black opacity-20 pointer-events-none"
            style={{ borderRadius: `${cornerRadius}px` }}
          />
          <div 
            className="absolute inset-0 bg-black mix-blend-overlay pointer-events-none"
            style={{ borderRadius: `${cornerRadius}px` }}
          />
        </>
      )}

      {/* Main glass container */}
      <div
        className="glass relative overflow-hidden"
        style={{
          borderRadius: `${cornerRadius}px`,
          display: "inline-flex",
          alignItems: "center",
          gap: "24px",
          padding,
          transition: "all 0.2s ease-in-out",
          boxShadow: overLight
            ? "0px 16px 70px rgba(0, 0, 0, 0.75)"
            : "0px 12px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Backdrop layer with distortion */}
        <div
          className="glass__warp absolute inset-0 pointer-events-none"
          style={backdropStyle}
        />

        {/* Border effects */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: `${cornerRadius}px`,
            mixBlendMode: "screen",
            opacity: 0.2,
            padding: "1.5px",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            boxShadow: "0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35)",
            background: borderGradient,
          }}
        />
        
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: `${cornerRadius}px`,
            mixBlendMode: "overlay",
            padding: "1.5px",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            boxShadow: "0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35)",
            background: borderGradient.replace(/0\.12/g, "0.32").replace(/0\.4/g, "0.6"),
          }}
        />

        {/* Hover effects */}
        {onClick && (
          <>
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                borderRadius: `${cornerRadius}px`,
                opacity: isHovered || isActive ? 0.5 : 0,
                backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%)",
                mixBlendMode: "overlay",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                borderRadius: `${cornerRadius}px`,
                opacity: isActive ? 0.5 : 0,
                backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 80%)",
                mixBlendMode: "overlay",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                borderRadius: `${cornerRadius}px`,
                opacity: isHovered ? 0.4 : isActive ? 0.8 : 0,
                backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)",
                mixBlendMode: "overlay",
              }}
            />
          </>
        )}

        {/* Content */}
        <div
          className="text-white transition-all duration-150 ease-in-out relative z-10"
          style={{
            font: "500 20px/1 system-ui",
            textShadow: overLight
              ? "0px 2px 12px rgba(0, 0, 0, 0)"
              : "0px 2px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
} 