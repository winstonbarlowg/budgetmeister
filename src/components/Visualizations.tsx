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

  // Modern pastel fintech color palette - soft, professional, accessible
  const chartColors = [
    '#93c5fd', // blue-300 - soft blue
    '#86efac', // green-300 - mint green
    '#fda4af', // rose-300 - soft pink
    '#fcd34d', // amber-300 - pastel yellow
    '#c4b5fd', // violet-300 - lavender
    '#67e8f9', // cyan-300 - aqua
    '#fdba74', // orange-300 - peach
    '#a5b4fc', // indigo-300 - periwinkle
    '#f9a8d4', // pink-300 - blush
    '#a7f3d0', // emerald-300 - seafoam
    '#7dd3fc', // sky-300 - sky blue
    '#d8b4fe', // purple-300 - lilac
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
      color: "#fda4af", // rose-300 - soft pink
    },
    Variable: {
      label: "Variable Expenses",
      color: "#93c5fd", // blue-300 - soft blue
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
      color: "#fda4af", // rose-300 - soft pink
    },
    Variable: {
      label: "Variable Expenses",
      color: "#93c5fd", // blue-300 - soft blue
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
      color: "#d1d5db", // gray-300 - soft gray
    },
    actual: {
      label: "Actual",
      color: "#93c5fd", // blue-300 - soft blue
    },
  } satisfies ChartConfig;

  // 5. Variance Waterfall (simplified as bar chart showing variance per category)
  const varianceData = selectedMonth.categories
    .map((c) => ({
      name: c.name,
      variance: c.variance,
      color: c.variance > 0 ? '#fda4af' : '#86efac', // rose-300 for over, green-300 for under
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

  const getHeatmapColor = (percentVariance: number) => {
    if (percentVariance <= -20) return '#86efac'; // green-300 - mint green
    if (percentVariance <= -10) return '#a7f3d0'; // emerald-300 - seafoam
    if (percentVariance <= 10) return '#fcd34d'; // amber-300 - pastel yellow
    if (percentVariance <= 20) return '#fdba74'; // orange-300 - peach
    return '#fda4af'; // rose-300 - soft pink
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
                <label className="text-xs text-muted-foreground">Year</label>
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
                <label className="text-xs text-muted-foreground">Month</label>
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
            <CardTitle>Category Variance</CardTitle>
            <CardDescription>{getMonthName(selectedMonth.month)} {selectedMonth.year}</CardDescription>
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
          <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Budget Used: {ytdPercent.toFixed(1)}%</span>
                <span>{formatCurrency(ytdActual)} / {formatCurrency(ytdBudget)}</span>
              </div>
              <div className="progress-bar" style={{ height: '24px' }}>
                <div
                  className={`progress-fill ${ytdPercent > 100 ? 'over-budget' : ''}`}
                  style={{ width: `${Math.min(ytdPercent, 100)}%` }}
                />
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Expected at this point: {expectedPercent.toFixed(1)}%</span>
              </div>
              <div className="progress-bar" style={{ height: '12px', background: '#e0e0e0' }}>
                <div
                  style={{
                    width: `${Math.min(expectedPercent, 100)}%`,
                    height: '100%',
                    background: '#9ca3af',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              {ytdPercent <= expectedPercent ? (
                <div style={{ color: '#10b981', fontWeight: 600 }}>On track!</div>
              ) : (
                <div style={{ color: '#ef4444', fontWeight: 600 }}>
                  {(ytdPercent - expectedPercent).toFixed(1)}% over expected pace
                </div>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                    Category
                  </th>
                  {yearData.map((month) => (
                    <th
                      key={month.month}
                      style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}
                    >
                      {getMonthShortName(month.month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.category}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.category}</td>
                    {row.months.map((variance, idx) => (
                      <td
                        key={idx}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          backgroundColor: getHeatmapColor(variance),
                          color: Math.abs(variance) > 15 ? 'white' : '#1a1a1a',
                          fontWeight: 500,
                        }}
                        title={`${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`}
                      >
                        {variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(0)}%` : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#10b981', borderRadius: '4px' }} />
              <span>Well under budget</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fbbf24', borderRadius: '4px' }} />
              <span>On track</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }} />
              <span>Over budget</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
