import React, { useId, useMemo } from 'react';

interface GlassContainerProps {
  width: number;
  height: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  cornerRadius?: number;
  darknessOpacity?: number;
  darknessBlur?: number;
  lightnessOpacity?: number;  
  lightnessBlur?: number;
  centerDistortion?: number;
  centerSize?: number;
  preBlur?: number;
  postBlur?: number;
  iridescence?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  width,
  height,
  children,
  className = '',
  style = {},
  cornerRadius = 25,
  darknessOpacity = 17,
  darknessBlur = 5,
  lightnessOpacity = 17,
  lightnessBlur = 15,
  centerDistortion = 68,
  centerSize = 15,  
  preBlur = 7,
  postBlur = 0,
  iridescence = 20,
}) => {
  const filterId = useId();
  const uniqueFilterId = `glass-filter-${filterId}`;

  const svgFilter = useMemo(() => {
    const w = width;
    const h = height;
    
    // Calculate positions for centered rectangles
    const rectX = w / 4;
    const rectY = h / 4;
    const rectWidth = w / 2;
    const rectHeight = h / 2;
    
    // Generate SVG data URLs
    const thing9Href = `data:image/svg+xml,%3Csvg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='rgb%280 0 0 %2F${darknessOpacity/2.55}%25%29' /%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='%23FFF' style='filter:blur(${darknessBlur}px)' /%3E%3C/svg%3E`;
    
    const thing0Href = `data:image/svg+xml,%3Csvg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='rgb%28255 255 255 %2F${lightnessOpacity/2.55}%25%29' style='filter:blur(${lightnessBlur}px)' /%3E%3C/svg%3E`;
    
    const thing1Href = `data:image/svg+xml,%3Csvg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='%23000' /%3E%3C/svg%3E`;
    
    const thing2Href = `data:image/svg+xml,%3Csvg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gradient1' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%2300F'/%3E%3C/linearGradient%3E%3ClinearGradient id='gradient2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%230F0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='0' y='0' width='${w}' height='${h}' rx='${cornerRadius}' fill='%237F7F7F' /%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='%23000' /%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='url(%23gradient1)' style='mix-blend-mode: screen' /%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='url(%23gradient2)' style='mix-blend-mode: screen' /%3E%3Crect x='${rectX}' y='${rectY}' width='${rectWidth}' height='${rectHeight}' rx='${cornerRadius}' fill='rgb%28127 127 127 %2F${(255-centerDistortion)/2.55}%25%29' style='filter:blur(${20-centerSize}px)' /%3E%3C/svg%3E`;

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: -9999, left: -9999 }}
      >
        <filter id={uniqueFilterId}>
          <feImage
            xlinkHref={thing9Href}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="thing9"
          />
          <feImage
            xlinkHref={thing0Href}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="thing0"
          />
          <feImage
            xlinkHref={thing1Href}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="thing1"
          />
          <feImage
            xlinkHref={thing2Href}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="thing2"
          />
          <feGaussianBlur 
            stdDeviation={preBlur / 10} 
            in="SourceGraphic" 
            result="preblur" 
          />
          <feDisplacementMap
            in2="thing2"
            in="preblur"
            scale={-150 + iridescence / 10}
            xChannelSelector="B"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="disp1"
          />
          <feDisplacementMap
            in2="thing2"
            in="preblur"
            scale={-150}
            xChannelSelector="B"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="disp2"
          />
          <feDisplacementMap
            in2="thing2"
            in="preblur"
            scale={-150 - iridescence / 10}
            xChannelSelector="B"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
            result="disp3"
          />
          <feBlend in2="disp2" mode="screen" />
          <feBlend in2="disp1" mode="screen" />
          <feGaussianBlur stdDeviation={postBlur / 10} />
          <feBlend in2="thing0" mode="screen" />
          <feBlend in2="thing9" mode="multiply" />
          <feComposite in2="thing1" operator="in" />
        </filter>
      </svg>
    );
  }, [
    width,
    height,
    cornerRadius,
    darknessOpacity,
    darknessBlur,
    lightnessOpacity,
    lightnessBlur,
    centerDistortion,
    centerSize,
    preBlur,
    postBlur,
    iridescence,
    uniqueFilterId,
  ]);

  return (
    <>
      {svgFilter}
      <div
        className={className}
        style={{
          width,
          height,
          backdropFilter: `url(#${uniqueFilterId})`,
          WebkitBackdropFilter: `url(#${uniqueFilterId})`,
          ...style,
        }}
      >
        {children}
      </div>
    </>
  );
};
