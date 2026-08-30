interface TrendChartProps {
  points: { date: string; value: number }[];
  color?: string;
  unit?: string;
  height?: number;
}

/** A small line chart with no external charting library — just plain
 * SVG, matching the app's existing hand-built visuals (PlateRing,
 * BottomNav icons). Shows min/max and first/last date for context. */
export function TrendChart({
  points,
  color = "var(--plate-yellow)",
  unit = "",
  height = 120,
}: TrendChartProps) {
  if (points.length === 0) {
    return <p className="trend-empty">No entries yet.</p>;
  }

  if (points.length === 1) {
    return (
      <div className="trend-single">
        <span className="trend-single-value">
          {points[0].value}
          {unit}
        </span>
        <span className="trend-single-date">{formatShortDate(points[0].date)}</span>
      </div>
    );
  }

  const width = 320;
  const padding = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (width - padding * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y =
      height - padding - ((p.value - min) / range) * (height - padding * 2);
    return { x, y, value: p.value };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} ` +
    `L ${coords[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <path d={areaPath} fill={color} opacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="trend-chart-labels">
        <span>{formatShortDate(points[0].date)}</span>
        <span className="trend-chart-range">
          {min}
          {unit} – {max}
          {unit}
        </span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}