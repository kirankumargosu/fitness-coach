interface PlateRingProps {
  /** 0–1 fraction filled */
  fraction: number;
  size?: number;
  color?: string;
  label: string;
  value: string;
}

/**
 * A weight-plate-styled radial gauge: the ring reads like the rim of a
 * loading plate, with the number sitting where the hub would be.
 */
export function PlateRing({
  fraction,
  size = 76,
  color = "var(--plate-yellow)",
  label,
  value,
}: PlateRingProps) {
  const stroke = 6;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, fraction));
  const offset = circumference * (1 - clamped);

  return (
    <div className="plate-ring" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="plate-ring-text">
        <span className="plate-ring-value">{value}</span>
        <span className="plate-ring-label">{label}</span>
      </div>
    </div>
  );
}
