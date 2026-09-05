export type TimePeriod = '7d' | '30d' | '90d' | 'all' | 'custom';

export type TimeSeriesDataPoint = {
  date: string; // ISO date string (YYYY-MM-DD)
  totalPireps: number;
  totalFlightTime: number;
  careerFlightTime: number;
  activePilots: number;
  totalUsers: number; // for active pilot rate calculation
  newPilots: number; // number of pilots who joined on this day
};

export type SparklineData = {
  value: number;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  data: number[]; // array of values for sparkline
};

export type StatisticsData = {
  // Current period metrics
  totalPilots: number;
  totalFlights: number;
  totalFlightHours: number;
  activePilotRate: number; // percentage
  // Sparkline data for each metric
  sparklines: {
    totalPilots: SparklineData;
    totalFlights: SparklineData;
    totalFlightHours: SparklineData;
    activePilotRate: SparklineData;
  };
  // Time series data for main chart
  timeSeries: TimeSeriesDataPoint[];
};

export type PeriodDates = {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
};

export type PeriodComparison = {
  current: {
    totalPireps: number;
    totalFlightTime: number;
    totalPilots: number;
  };
  previous: {
    totalPireps: number;
    totalFlightTime: number;
    totalPilots: number;
  };
  changes: {
    flights: { value: number; percentage: number };
    hours: { value: number; percentage: number };
    pilots: { value: number; percentage: number };
    rate: { value: number; percentage: number };
  };
};

export type PilotStatistics = {
  totalRegistered: number;
  activeThisPeriod: number;
  inactiveCount: number;
  activityRate: number;
  registrationTrend: TimeSeriesDataPoint[];
};

export type FlightStatistics = {
  totalFlights: number;
  averagePerDay: number;
  dailyTrend: TimeSeriesDataPoint[];
};

export type FlightHoursStatistics = {
  totalHours: number;
  averageHoursPerFlight: number;
  averageHoursPerPilot: number;
  hoursDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  hoursTrend: TimeSeriesDataPoint[];
};

export type ActivePilotStatistics = {
  currentActiveCount: number;
  activityRate: number;
  activityThreshold: number; // days considered for "active"
  activityBreakdown: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  monthlyActivity: Array<{
    month: string;
    activePilots: number;
    totalPilots: number;
    rate: number;
  }>;

  // Daily (or per-period) time-series of active pilots for the currently selected period
  // This mirrors the `dailyTrend` in other statistics types so the chart can render
  // correctly for any chosen period
  dailyTrend: TimeSeriesDataPoint[];
};

export type TabStatistics = {
  pilots: PilotStatistics;
  flights: FlightStatistics;
  flightHours: FlightHoursStatistics;
  activePilots: ActivePilotStatistics;
};

// Combined statistics that include per-tab datasets
export type StatisticsTabsData = StatisticsData & {
  tabs: TabStatistics;
};

// Temporary alias to avoid breaking references; will be removed in future cleanup
export type EnhancedStatisticsData = StatisticsTabsData;

export type StatisticsTab =
  | 'pilots'
  | 'flights'
  | 'flight-hours'
  | 'active-pilots';
