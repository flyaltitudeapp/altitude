'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getPeriodLabel, useChartConfig } from '@/lib/chart-utils';
import { formatDateForPeriod, formatDateForTooltip } from '@/lib/date-utils';
import { formatHoursMinutes } from '@/lib/utils';
import type { TimePeriod, TimeSeriesDataPoint } from '@/types/statistics';

export interface FlightsChartProps {
  data: TimeSeriesDataPoint[];
  period: TimePeriod;
  loading?: boolean;
  height?: number;
  title?: string;
  description?: string;
  tooltipMetric?:
    | 'newPilots'
    | 'totalPireps'
    | 'totalFlightTime'
    | 'activePilots';
  /** Optional second series drawn on the same chart (e.g. career hours next to total hours). */
  secondarySeries?: {
    dataKey: keyof TimeSeriesDataPoint;
    label: string;
    /** Format the raw value for the tooltip (e.g. formatHoursMinutes). */
    formatValue?: (value: number) => string | number;
  };
  customDays?: number; // Add customDays prop
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TimeSeriesDataPoint;
    value: number;
  }>;
  label?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  metric,
  secondarySeries,
}: CustomTooltipProps & {
  metric: FlightsChartProps['tooltipMetric'];
  secondarySeries?: FlightsChartProps['secondarySeries'];
}) => {
  if (!active || !payload || !payload.length || !label) {
    return null;
  }

  const data = payload[0].payload;

  const metricMap = {
    newPilots: { label: 'New Pilots', value: data.newPilots },
    totalPireps: { label: 'Flights', value: data.totalPireps },
    totalFlightTime: {
      label: 'Flight Hours',
      value: formatHoursMinutes(data.totalFlightTime),
    },
    activePilots: { label: 'Active Pilots', value: data.activePilots },
  };
  const metricInfo = metricMap[metric || 'totalPireps'];

  const secondaryRaw = secondarySeries
    ? (data[secondarySeries.dataKey] as number)
    : undefined;
  const secondaryFormatted =
    secondarySeries && secondaryRaw !== undefined
      ? secondarySeries.formatValue
        ? secondarySeries.formatValue(secondaryRaw)
        : secondaryRaw
      : undefined;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-2">
        {formatDateForTooltip(label)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {metricInfo.label}:
          </span>
          <span className="text-sm font-medium">{metricInfo.value}</span>
        </div>
        {secondarySeries && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {secondarySeries.label}:
            </span>
            <span className="text-sm font-medium">{secondaryFormatted}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const FlightsChart = ({
  data,
  period,
  loading = false,
  height = 320,
  title,
  description,
  tooltipMetric = 'totalPireps',
  secondarySeries,
  customDays, // Add customDays parameter
}: FlightsChartProps) => {
  const chartConfig = useChartConfig();

  if (loading) {
    return <ChartSkeleton height={height} />;
  }

  // Determine XAxis interval for best UX based on period and data length
  let xAxisInterval: number | undefined = undefined;

  if (period === '7d') {
    xAxisInterval = 0; // Show all days for 7 days
  } else if (period === '30d') {
    xAxisInterval = 4; // Show every 5th day for 30 days
  } else if (period === '90d') {
    xAxisInterval = 8; // Show every 9th day for 90 days
  } else if (period === 'custom' && customDays) {
    // Calculate interval for custom periods based on number of days
    if (customDays <= 7) {
      xAxisInterval = 0; // Show all days for 7 days or less
    } else if (customDays <= 30) {
      xAxisInterval = Math.floor(customDays / 7); // Show roughly 7 ticks
    } else if (customDays <= 90) {
      xAxisInterval = Math.floor(customDays / 10); // Show roughly 10 ticks
    } else {
      xAxisInterval = Math.floor(customDays / 12); // Show roughly 12 ticks for longer periods
    }
  } else {
    // For 'all' period, let Recharts auto-decide
    xAxisInterval = undefined;
  }

  const primaryLegendLabel =
    tooltipMetric === 'totalFlightTime'
      ? 'Total Hours'
      : tooltipMetric === 'newPilots'
        ? 'New Pilots'
        : tooltipMetric === 'activePilots'
          ? 'Active Pilots'
          : 'Flights';

  return (
    <div className="w-full bg-panel rounded-md">
      <div className="pb-4 px-6 pt-6">
        <div className="text-lg font-semibold">{title ?? 'Flights Logged'}</div>
        <div className="text-muted-foreground">
          {description ??
            `Daily flight activity over ${getPeriodLabel(period, customDays)}`}
        </div>
        {secondarySeries && (
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: chartConfig.primary }}
              />
              <span className="text-muted-foreground">
                {primaryLegendLabel}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: chartConfig.secondary }}
              />
              <span className="text-muted-foreground">
                {secondarySeries.label}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="p-6 pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="flightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={chartConfig.primary}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={chartConfig.primary}
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="flightSecondaryGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={chartConfig.secondary}
                  stopOpacity={0.45}
                />
                <stop
                  offset="95%"
                  stopColor={chartConfig.secondary}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartConfig.grid}
              opacity={0.3}
            />

            <XAxis
              dataKey="date"
              tickFormatter={(date) =>
                formatDateForPeriod(date, period, customDays)
              }
              stroke={chartConfig.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={4}
              interval={xAxisInterval}
            />

            <YAxis
              stroke={chartConfig.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toString()}
            />

            <Tooltip
              content={
                <CustomTooltip
                  metric={tooltipMetric}
                  secondarySeries={secondarySeries}
                />
              }
              cursor={{ fill: 'transparent' }}
            />

            <Area
              type="monotone"
              dataKey="totalPireps"
              stroke={chartConfig.primary}
              strokeWidth={2}
              fill="url(#flightGradient)"
              activeDot={{
                r: 4,
                stroke: chartConfig.primary,
                strokeWidth: 2,
                fill: chartConfig.background,
              }}
            />
            {secondarySeries && (
              <Area
                type="monotone"
                dataKey={secondarySeries.dataKey}
                stroke={chartConfig.secondary}
                strokeWidth={2}
                fill="url(#flightSecondaryGradient)"
                activeDot={{
                  r: 4,
                  stroke: chartConfig.secondary,
                  strokeWidth: 2,
                  fill: chartConfig.background,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ChartSkeleton = ({ height }: { height: number }) => (
  <div className="w-full bg-panel rounded-md">
    <div className="pb-4 px-6 pt-6">
      <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-muted rounded animate-pulse" />
    </div>
    <div className="p-6 pt-0">
      <div
        className="w-full bg-muted rounded animate-pulse"
        style={{ height }}
      />
    </div>
  </div>
);
