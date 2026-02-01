import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { calculateCvTEGrade } from "@/services/test-database";

interface CvTEChartProps {
  maxPoints: number;
  nTerms?: number[]; // Array of n-terms to compare, e.g., [0, 1.0, 2.0]
  mode?: "legacy" | "official" | "main";
}

function CvTEChartComponent({
  maxPoints,
  nTerms = [0, 1.0, 2.0],
  mode = "legacy",
}: CvTEChartProps) {
  const { t } = useTranslation();

  // Calculate chart data WITHOUT useMemo to avoid dependency issues
  const data: Record<string, number>[] = [];
  const step = Math.max(1, Math.floor(maxPoints / 100)); // Generate ~100 data points

  // Create safe keys for CSS variables (replace dots with underscores)
  const getSafeKey = (n: number) => `n${n.toString().replace(".", "_")}`;

  for (let points = 0; points <= maxPoints; points += step) {
    const dataPoint: Record<string, number> = {
      points,
      percentage: Math.round((points / maxPoints) * 100),
    };

    nTerms.forEach((n) => {
      const grade = calculateCvTEGrade(points, maxPoints, n, mode);
      dataPoint[getSafeKey(n)] = grade ?? 1; // Default to 1 if null
    });

    data.push(dataPoint);
  }

  // Always include the last point
  if (data[data.length - 1]?.points !== maxPoints) {
    const dataPoint: Record<string, number> = {
      points: maxPoints,
      percentage: 100,
    };

    nTerms.forEach((n) => {
      const grade = calculateCvTEGrade(maxPoints, maxPoints, n, mode);
      dataPoint[getSafeKey(n)] = grade ?? 10; // Default to 10 if null
    });

    data.push(dataPoint);
  }

  const chartData = data;

  // Chart config WITHOUT useMemo
  const chartConfig: ChartConfig = {};
  const colors = [
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#eab308", // Yellow
    "#a855f7", // Purple
  ];

  nTerms.forEach((n, index) => {
    chartConfig[getSafeKey(n)] = {
      label: `n=${n.toFixed(1)}`,
      color: colors[index % colors.length],
    };
  });

  // Calculate pass grade percentages WITHOUT useMemo
  const percentages: { n: number; percentage: number }[] = [];
  nTerms.forEach((n) => {
    // Binary search to find where grade >= 5.5 (sufficient)
    let low = 0;
    let high = maxPoints;
    let result = maxPoints;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const grade = calculateCvTEGrade(mid, maxPoints, n, mode);

      if (grade !== null && grade >= 5.5) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    percentages.push({
      n,
      percentage: Math.round((result / maxPoints) * 100),
    });
  });

  const passGradePercentages = percentages;

  // Calculate precise points needed for grade 6 with current n-term (second value in array)
  // Use nTerms[1] which is the middle/current n-term value
  const currentNTerm = nTerms[1] ?? 1.0;
  let pointsForGrade6 = maxPoints;
  let low = 0;
  let high = maxPoints;
  const precision = 0.1; // Search to 0.1 point precision
  
  while (high - low > precision) {
    const mid = (low + high) / 2;
    const grade = calculateCvTEGrade(mid, maxPoints, currentNTerm, mode);
    if (grade !== null && grade >= 6) {
      pointsForGrade6 = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("cvteChart", "Cijferverloop")} -{" "}
          {mode === "legacy"
            ? t("cvteCalculationLegacy", "Legacyberekening")
            : mode === "official"
              ? t("cvteCalculationOfficial", "Officiële berekening")
              : t("cvteCalculationMain", "Hoofdberekening")}
        </CardTitle>
        <CardDescription>
          {t(
            "cvteChartDescription",
            "Visualisatie van hoe het cijfer verandert op basis van behaalde punten",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 80, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="points"
                type="number"
                label={{
                  value: t("pointsLabel", "Punten"),
                  position: "insideBottom",
                  offset: -10,
                }}
                domain={[0, maxPoints]}
                allowDataOverflow={false}
                className="text-xs"
              />
              <YAxis
                label={{
                  value: t("grade", "Cijfer"),
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />

              {/* Reference line at grade 6 (passing grade) */}
              <ReferenceLine
                y={6}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: t("passingGrade", "Voldoende"),
                  position: "right",
                  className: "text-xs fill-muted-foreground",
                }}
              />

              {/* Vertical reference line for points needed for grade 6 with n=1.0 */}
              <ReferenceLine
                x={pointsForGrade6}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${pointsForGrade6.toFixed(1)}`,
                  position: "top",
                  fill: "#3b82f6",
                  className: "text-xs font-semibold",
                }}
              />

              {/* Lines for each n-term */}
              {nTerms.map((n, index) => {
                const safeKey = getSafeKey(n);
                const color = colors[index % colors.length];
                return (
                  <Line
                    key={safeKey}
                    type="monotone"
                    dataKey={safeKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Display pass percentages */}
        <div className="mt-4 space-y-1 text-sm">
          <p className="text-muted-foreground font-medium">
            {t("passingPercentages", "Percentage voor voldoende (≥6):")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {passGradePercentages.map(({ n, percentage }) => (
              <div
                key={n}
                className="bg-muted rounded-md px-3 py-2 text-center"
              >
                <span className="font-semibold">n={n.toFixed(1)}</span>
                {": "}
                <span className="text-muted-foreground">≥{percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize the component with custom comparison to prevent unnecessary re-renders
export const CvTEChart = memo(CvTEChartComponent, (prevProps, nextProps) => {
  // Only re-render if maxPoints, mode, or nTerms values actually changed
  return (
    prevProps.maxPoints === nextProps.maxPoints &&
    prevProps.mode === nextProps.mode &&
    JSON.stringify(prevProps.nTerms) === JSON.stringify(nextProps.nTerms)
  );
});
