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
  Label as ChartLabel,
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

  // Category slices use each category's colour from Settings, falling back to the theme chart colours
  const fallbackColors = [1, 2, 3, 4, 5].map((n) => `hsl(var(--chart-${n}))`);

  // Fixed and Variable use the same colours in every chart
  const fixedVariableConfig = {
    Fixed: { label: 'Fixed', color: 'hsl(var(--chart-1))' },
    Variable: { label: 'Variable', color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;

  // 1. Monthly Budget vs Actual Bar Chart
  const budgetVsActualData = [
    { name: 'Budget', Fixed: selectedMonth.fixedBudget, Variable: selectedMonth.variableBudget },
    { name: 'Actual', Fixed: selectedMonth.fixedActual, Variable: selectedMonth.variableActual },
  ];

  // 2. Spending by Category (Donut Chart)
  const categorySpendingData = selectedMonth.categories
    .filter((c) => c.actualAmount > 0)
    .sort((a, b) => b.actualAmount - a.actualAmount)
    .map((c, index) => ({ key: `cat${index}`, name: c.name, value: c.actualAmount, fill: `var(--color-cat${index})` }));

  const categoryConfig: ChartConfig = Object.fromEntries(
    selectedMonth.categories
      .filter((c) => c.actualAmount > 0)
      .sort((a, b) => b.actualAmount - a.actualAmount)
      .map((c, index) => [`cat${index}`, { label: c.name, color: c.color || fallbackColors[index % fallbackColors.length] }])
  );

  // 3. Fixed vs Variable Split (Pie)
  const fixedVsVariableData = [
    { key: 'Fixed', value: selectedMonth.fixedActual, fill: 'var(--color-Fixed)' },
    { key: 'Variable', value: selectedMonth.variableActual, fill: 'var(--color-Variable)' },
  ];

  // 4. Monthly Trend Line (months with no spending yet leave a gap rather than dropping to £0)
  const monthlyTrendData = yearData.map((month) => ({
    month: getMonthShortName(month.month),
    budget: month.totalBudget,
    actual: month.totalActual > 0 ? month.totalActual : null,
  }));

  const trendConfig = {
    budget: { label: 'Budget', color: 'hsl(var(--muted-foreground))' },
    actual: { label: 'Actual', color: 'hsl(var(--info))' },
  } satisfies ChartConfig;

  // 5. Variance per variable category (fixed expenses are expected to match their budget)
  const varianceData = selectedMonth.categories
    .filter((c) => c.type === 'variable')
    .map((c) => ({
      name: c.name,
      variance: c.variance,
      fill: c.variance > 0 ? 'var(--color-over)' : 'var(--color-under)',
    }))
    .sort((a, b) => b.variance - a.variance);

  const varianceConfig = {
    variance: { label: 'Variance' },
    over: { label: 'Over budget', color: 'hsl(var(--destructive))' },
    under: { label: 'Under budget', color: 'hsl(var(--success))' },
  } satisfies ChartConfig;

  const formatSignedCurrency = (value: number) => `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
  const formatAxisCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 }).format(value);

  // 6. YTD Progress
  const ytdBudget = yearData.reduce((sum, m) => sum + m.totalBudget, 0);
  const ytdActual = yearData.reduce((sum, m) => sum + m.totalActual, 0);
  const ytdPercent = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;

  const currentMonthIndex = new Date().getMonth() + 1;
  const expectedPercent = (currentMonthIndex / 12) * 100;

  // 7. Category Variance Heatmap (simplified grid view)
  const heatmapData = currentMonth.categories.map((category) => {
    const monthlyData = yearData.map((month) => {
      if (month.totalActual === 0) return null; // no spending recorded that month
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

  const getHeatmapClass = (percentVariance: number | null) => {
    if (percentVariance === null || percentVariance === 0) return 'bg-muted/50 text-muted-foreground'; // shown as "-": nothing to compare
    if (percentVariance <= -20) return HEATMAP_CLASSES.wellUnder;
    if (percentVariance <= -10) return HEATMAP_CLASSES.under;
    if (percentVariance <= 10) return HEATMAP_CLASSES.onTrack;
    if (percentVariance <= 20) return HEATMAP_CLASSES.caution;
    return HEATMAP_CLASSES.over;
  };

  return (
    <div className="space-y-4">
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
      <div className="grid grid-cols-2 gap-4">
        {/* 1. Budget vs Actual Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fixedVariableConfig} className="min-h-[300px] w-full">
              <BarChart accessibilityLayer data={budgetVsActualData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxisCurrency} width={60} />
                <ChartTooltip content={<ChartTooltipContent valueFormatter={formatCurrency} />} />
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
            {categorySpendingData.length === 0 ? (
              <p className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                No spending recorded this month.
              </p>
            ) : (
              <ChartContainer config={categoryConfig} className="mx-auto aspect-square max-h-[380px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel valueFormatter={formatCurrency} />} />
                  <Pie data={categorySpendingData} dataKey="value" nameKey="key" innerRadius={70} outerRadius={110} strokeWidth={2}>
                    <ChartLabel
                      content={({ viewBox }) => {
                        if (!viewBox || !('cx' in viewBox)) return null;
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">
                              {formatCurrency(selectedMonth.totalActual)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-xs">
                              Spent
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="key" />}
                    className="flex-wrap gap-x-3 gap-y-1 text-xs"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. Fixed vs Variable Split */}
        <Card>
          <CardHeader>
            <CardTitle>Fixed vs Variable Split</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fixedVariableConfig} className="mx-auto aspect-square max-h-[300px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel valueFormatter={formatCurrency} />} />
                <Pie data={fixedVsVariableData} dataKey="value" nameKey="key" outerRadius={100} strokeWidth={2} />
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
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
            {/* One row per category so every name gets a label */}
            <ChartContainer
              config={varianceConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(300, varianceData.length * 32) }}
            >
              <BarChart accessibilityLayer data={varianceData} layout="vertical">
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatAxisCurrency} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} interval={0} />
                <ChartTooltip content={<ChartTooltipContent valueFormatter={formatSignedCurrency} />} />
                <Bar dataKey="variance" radius={4}>
                  {varianceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
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
          <div className="space-y-6 p-4">
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
            <LineChart accessibilityLayer data={monthlyTrendData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxisCurrency} width={60} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" valueFormatter={formatCurrency} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-actual)' }} />
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
                      title={variance === null ? 'No spending recorded' : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`}
                    >
                      {variance !== null && variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(0)}%` : '-'}
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
