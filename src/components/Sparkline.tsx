// Simple SVG Sparkline component

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeColor?: string; // Alias for color
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color = "currentColor",
  strokeColor,
  className = ""
}: SparklineProps) {
  // Use strokeColor if provided, otherwise fall back to color
  const lineColor = strokeColor || color;
  if (!data || data.length < 2) return null;

  // Normalize data to 0-1
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const normalized = data.map(v => (v - min) / range);

  // Generate path
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  
  const points = normalized.map((v, i) => {
    const x = padding + (i / (normalized.length - 1)) * innerWidth;
    const y = padding + (1 - v) * innerHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Trend indicator
  const trend = normalized[normalized.length - 1] > normalized[0] ? "up" : "down";

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={padding + innerWidth}
        cy={padding + (1 - normalized[normalized.length - 1]) * innerHeight}
        r={2}
        fill={trend === "up" ? "#ef4444" : "#22c55e"}
      />
    </svg>
  );
}

// Default export for backwards compatibility
export default Sparkline;
