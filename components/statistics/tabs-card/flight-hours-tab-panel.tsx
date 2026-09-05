'use client';

import React, { useMemo, useRef } from 'react';

import { FlightsChart } from '@/components/charts/flights-chart';
import { getPeriodLabel } from '@/lib/chart-utils';
import { formatHoursMinutes } from '@/lib/utils';
import type { FlightHoursStatistics, TimePeriod } from '@/types/statistics';

interface FlightHoursTabPanelProps {
  data: FlightHoursStatistics | null;
  period: TimePeriod;
  loading?: boolean;
  customDays?: number; // Add customDays prop
}

export const FlightHoursTabPanel = ({
  data,
  period,
  loading = false,
  customDays,
}: FlightHoursTabPanelProps) => {
  const lastData = useRef<FlightHoursStatistics | null>(null);
  if (data) {
    lastData.current = data;
  }

  const chartData = useMemo(() => {
    const raw = lastData.current
      ? lastData.current.hoursTrend.map((d) => ({
          ...d,
          totalPireps: d.totalFlightTime / 60,
          // Render career hours on the same decimal-hours scale as the primary area.
          careerFlightTime: d.careerFlightTime / 60,
        }))
      : [];

    return raw;
  }, [data]);

  if (loading && !lastData.current) {
    return (
      <FlightsChart
        data={[]}
        period={period}
        loading={true}
        customDays={customDays}
      />
    );
  }

  return (
    <FlightsChart
      data={chartData}
      period={period}
      loading={false}
      height={320}
      title="Flight Hours"
      description={`Total vs career flight hours over ${getPeriodLabel(period, customDays)}`}
      tooltipMetric="totalFlightTime"
      secondarySeries={{
        dataKey: 'careerFlightTime',
        label: 'Career Hours',
        // chartData stores career hours as a decimal; convert back to minutes for the label.
        formatValue: (v) => formatHoursMinutes(v * 60),
      }}
      customDays={customDays}
    />
  );
};
