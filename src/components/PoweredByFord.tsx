"use client";

export default function PoweredByFord({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const textColor = variant === "dark" ? "text-gray-500" : "text-white/60";
  const logoColor = variant === "dark" ? "#003478" : "#ffffff";
  
  return (
    <div className={`flex items-center gap-2 ${textColor}`}>
      <span className="text-xs font-medium uppercase tracking-wider">Powered by</span>
      <svg 
        width="60" 
        height="24" 
        viewBox="0 0 120 48" 
        fill={logoColor}
        className="transition-all"
      >
        {/* Ford Oval */}
        <ellipse cx="60" cy="24" rx="56" ry="20" fill="none" stroke={logoColor} strokeWidth="3"/>
        {/* F */}
        <path d="M28 14h14v3h-10v5h8v3h-8v9h-4V14z"/>
        {/* O */}
        <path d="M52 24c0-5.5 3.5-10.5 8-10.5s8 5 8 10.5-3.5 10.5-8 10.5-8-5-8-10.5zm4 0c0 3.5 1.8 7 4 7s4-3.5 4-7-1.8-7-4-7-4 3.5-4 7z"/>
        {/* R */}
        <path d="M72 14h8c4 0 6 2.5 6 6 0 2.5-1.5 4.5-4 5.5l5 8.5h-4.5l-4.5-8h-2v8h-4V14zm4 9h3.5c1.5 0 2.5-1 2.5-2.5s-1-2.5-2.5-2.5H76v5z"/>
        {/* D */}
        <path d="M90 14h6c6 0 10 4 10 10s-4 10-10 10h-6V14zm4 17h2c3.5 0 6-3 6-7s-2.5-7-6-7h-2v14z"/>
      </svg>
    </div>
  );
}
