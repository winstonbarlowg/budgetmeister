import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MonthSummary } from '../types';
import { formatCurrency, getMonthShortName, getMonthName } from '../utils/calculations';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '../lib/utils';

// Heatmap cell colours; the legend uses the same classes so they always match
const HEATMAP_CLASSES = {
  wellUnder: 'bg-emerald-400 text-emerald-950',
  under: 'bg-green-300 text-green-950',
  onTrack: 'bg-amber-300 text-amber-950',
  caution: 'bg-orange-400 text-orange-950',
  over: 'bg-rose-400 text-rose-950',
} as const;

const HEATMAP_LEGEND: { key: keyof typeof HEATMAP_CLASSES; label: string }[] = [
  { key: 'wellUnder', label: 'Well under budget' },
  { key: 'under', label: 'Under budget' },
  { key: 'onTrack', label: 'On track' },
  { key: 'caution', label: 'Slightly over' },
  { key: 'over', label: 'Over budget' },
];

interface VisualizationsProps {
  currentMonth: MonthSummary;
  yearData: MonthSummary[];
  onYearChange: (year: number) => void;
}

export const Visualizations: React.FC<VisualizationsProps> = ({ currentMonth, yearData, onYearChange }) => {
  // Get unique years from yearData (they all have the same year, so just use the first one's year)
  const currentYear = yearData.length > 0 ? yearData[0].year : currentMonth.year;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonth.month - 1);

  // For year selection, we'll need to generate a range of years (current year ± 5 years)
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Update selected year when yearData changes (when a different year is loaded)
  useEffect(() => {
    if (yearData.length > 0) {
      setSelectedYear(yearData[0].year);
    }
  }, [yearData]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    onYearChange(year);
  };

  const selectedMonth = yearData[selectedMonthIndex] || currentMonth;

  // Modern diverse fintech color palette - solid yet approachable
  const chartColors = [
    '#60a5fa', // blue-400 - medium blue
    '#34d399', // emerald-400 - teal green
    '#f472b6', // pink-400 - magenta
    '#fbbf24', // amber-400 - gold
    '#a78bfa', // violet-400 - purple
    '#22d3ee', // cyan-400 - turquoise
    '#fb923c', // orange-400 - coral
    '#818cf8', // indigo-400 - indigo
    '#fb7185', // rose-400 - rose
    '#4ade80', // green-400 - lime
    '#38bdf8', // sky-400 - light blue
    '#c084fc', // purple-400 - orchid
  ];

  // 1. Monthly Budget vs Actual Bar Chart
  const budgetVsActualData = [
    {
      name: 'Budget',
      Fixed: selectedMonth.fixedBudget,
      Variable: selectedMonth.variableBudget,
    },
    {
      name: 'Actual',
      Fixed: selectedMonth.fixedActual,
      Variable: selectedMonth.variableActual,
    },
  ];

  const budgetVsActualConfig = {
    Fixed: {
      label: "Fixed Expenses",
      color: "#fb7185", // rose-400 - rose
    },
    Variable: {
      label: "Variable Expenses",
      color: "#60a5fa", // blue-400 - medium blue
    },
  } satisfies ChartConfig;

  // 2. Spending by Category (Donut Chart)
  const categorySpendingData = selectedMonth.categories
    .filter((c) => c.actualAmount > 0)
    .sort((a, b) => b.actualAmount - a.actualAmount) // Sort by amount for better organization
    .map((c, index) => ({
      name: c.name,
      value: c.actualAmount,
      id: c.id,
      fill: chartColors[index % chartColors.length],
    }));

  const categoryConfig = categorySpendingData.reduce((acc, cat) => ({
    ...acc,
    [cat.id]: {
      label: cat.name,
      color: cat.fill,
    }
  }), {}) satisfies ChartConfig;

  // 3. Fixed vs Variable Split (Pie)
  const fixedVsVariableData = [
    { name: 'Fixed', value: selectedMonth.fixedActual },
    { name: 'Variable', value: selectedMonth.variableActual },
  ];

  const fixedVsVariableConfig = {
    Fixed: {
      label: "Fixed Expenses",
      color: "#fb7185", // rose-400 - rose
    },
    Variable: {
      label: "Variable Expenses",
      color: "#60a5fa", // blue-400 - medium blue
    },
  } satisfies ChartConfig;

  // 4. Monthly Trend Line
  const monthlyTrendData = yearData.map((month) => ({
    month: getMonthShortName(month.month),
    budget: month.totalBudget,
    actual: month.totalActual,
  }));

  const trendConfig = {
    budget: {
      label: "Budget",
      color: "#9ca3af", // gray-400 - medium gray
    },
    actual: {
      label: "Actual",
      color: "#60a5fa", // blue-400 - medium blue
    },
  } satisfies ChartConfig;

  // 5. Variance Waterfall (simplified as bar chart showing variance per category)
  // Only show variable expenses since fixed expenses are expected to have no variance
  const varianceData = selectedMonth.categories
    .filter((c) => c.type === 'variable')
    .map((c) => ({
      name: c.name,
      variance: c.variance,
      color: c.variance > 0 ? '#fb7185' : '#34d399', // rose-400 for over, emerald-400 for under
    }))
    .sort((a, b) => b.variance - a.variance);

  // 6. YTD Progress
  const ytdBudget = yearData.reduce((sum, m) => sum + m.totalBudget, 0);
  const ytdActual = yearData.reduce((sum, m) => sum + m.totalActual, 0);
  const ytdPercent = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;

  const currentMonthIndex = new Date().getMonth() + 1;
  const expectedPercent = (currentMonthIndex / 12) * 100;

  // 7. Category Variance Heatmap (simplified grid view)
  const heatmapData = currentMonth.categories.map((category) => {
    const monthlyData = yearData.map((month) => {
      const cat = month.categories.find((c) => c.id === category.id);
      if (!cat) return 0;
      const variance = cat.variance;
      const percentVariance = cat.budgetAmount > 0 ? (variance / cat.budgetAmount) * 100 : 0;
      return percentVariance;
    });

    return {
      category: category.name,
      months: monthlyData,
    };
  });

  const getHeatmapClass = (percentVariance: number) => {
    if (percentVariance === 0) return 'bg-muted/50 text-muted-foreground'; // shown as "-": nothing to compare
    if (percentVariance <= -20) return HEATMAP_CLASSES.wellUnder;
    if (percentVariance <= -10) return HEATMAP_CLASSES.under;
    if (percentVariance <= 10) return HEATMAP_CLASSES.onTrack;
    if (percentVariance <= 20) return HEATMAP_CLASSES.caution;
    return HEATMAP_CLASSES.over;
  };

  return (
    <div className="space-y-6">
      {/* Month and Year Selector Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Monthly Analytics</CardTitle>
              <CardDescription>View detailed charts for {getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(val) => handleYearChange(parseInt(val))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={selectedMonthIndex.toString()} onValueChange={(val) => setSelectedMonthIndex(parseInt(val))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearData.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {getMonthName(month.month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2-Column Grid for Monthly Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* 1. Budget vs Actual Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={budgetVsActualConfig} className="min-h-[300px] w-full">
              <BarChart data={budgetVsActualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCurrency} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="Fixed" fill="var(--color-Fixed)" radius={4} />
                <Bar dataKey="Variable" fill="var(--color-Variable)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 2. Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="min-h-[300px] w-full">
              <PieChart>
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                />
                <Pie
                  data={categorySpendingData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {categorySpendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '20px', fontSize: '12px' }}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 3. Fixed vs Variable Split */}
        <Card>
          <CardHeader>
            <CardTitle>Fixed vs Variable Split</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fixedVsVariableConfig} className="min-h-[300px] w-full">
              <PieChart>
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                />
                <Pie
                  data={fixedVsVariableData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  <Cell fill="#dc2626" />
                  <Cell fill="#2563eb" />
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '20px' }}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 5. Category Variance */}
        <Card>
          <CardHeader>
            <CardTitle>Variable Expense Variance</CardTitle>
            <CardDescription>Track spending variance for variable categories - {getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="min-h-[400px] w-full">
              <BarChart data={varianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis dataKey="name" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <Bar dataKey="variance" radius={4}>
                  {varianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 6. YTD Progress - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Year-to-Date Progress</CardTitle>
          <CardDescription>Budget performance across all months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Budget used: {ytdPercent.toFixed(1)}%</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCurrency(ytdActual)} / {formatCurrency(ytdBudget)}
                </span>
              </div>
              <Progress
                value={ytdPercent}
                className="h-6"
                variant={ytdPercent > 100 ? 'destructive' : ytdPercent > expectedPercent ? 'warning' : 'success'}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Expected at this point: {expectedPercent.toFixed(1)}%
              </div>
              <Progress value={expectedPercent} className="h-3 [&>div]:bg-muted-foreground/50" />
            </div>
            <div className="text-center font-semibold">
              {ytdPercent <= expectedPercent ? (
                <span className="text-success">On track!</span>
              ) : (
                <span className="text-destructive">
                  {(ytdPercent - expectedPercent).toFixed(1)}% over expected pace
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Monthly Trend Line - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
          <CardDescription>Budget vs actual spending across all months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="min-h-[300px] w-full">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 7. Category Variance Heatmap - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance Heatmap</CardTitle>
          <CardDescription>Yearly variance percentages by category and month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                {yearData.map((month) => (
                  <TableHead key={month.month} className="text-center">
                    {getMonthShortName(month.month)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {heatmapData.map((row) => (
                <TableRow key={row.category} className="hover:bg-transparent">
                  <TableCell className="font-medium whitespace-nowrap">{row.category}</TableCell>
                  {row.months.map((variance, idx) => (
                    <TableCell
                      key={idx}
                      className={cn('text-center font-medium tabular-nums', getHeatmapClass(variance))}
                      title={`${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`}
                    >
                      {variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(0)}%` : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            {HEATMAP_LEGEND.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn('h-5 w-5 rounded', HEATMAP_CLASSES[key])} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
