import React from 'react';
import { MonthSummary } from '../types';
import { formatCurrency, getMonthName } from '../utils/calculations';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '../lib/utils';

const varianceClass = (variance: number) => (variance <= 0 ? 'text-success' : 'text-destructive');

const getStatus = (actual: number, percentUsed: number): { label: string; className: string } => {
  if (actual === 0) return { label: 'No data', className: 'text-muted-foreground' };
  if (percentUsed <= 90) return { label: 'Great', className: 'bg-success/15 text-success border-success/30' };
  if (percentUsed <= 100) return { label: 'Good', className: 'bg-warning/15 text-warning border-warning/30' };
  if (percentUsed <= 110) return { label: 'Caution', className: 'bg-warning/25 text-warning border-warning/50' };
  return { label: 'Over', className: 'bg-destructive/15 text-destructive border-destructive/30' };
};

interface YearlyDashboardProps {
  year: number;
  yearData: MonthSummary[];
}

export const YearlyDashboard: React.FC<YearlyDashboardProps> = ({ year, yearData }) => {
  const totalBudget = yearData.reduce((sum, m) => sum + m.totalBudget, 0);
  const totalActual = yearData.reduce((sum, m) => sum + m.totalActual, 0);
  const totalVariance = totalActual - totalBudget;

  const avgMonthlyBudget = totalBudget / 12;
  const avgMonthlyActual = totalActual / yearData.filter(m => m.totalActual > 0).length || 0;

  // Months with no spending yet (e.g. the rest of this year) would otherwise look fully under budget
  const monthsWithSpending = yearData.filter(m => m.totalActual > 0);
  const bestMonth = [...monthsWithSpending].sort((a, b) => a.totalVariance - b.totalVariance)[0];
  const worstMonth = [...monthsWithSpending].sort((a, b) => b.totalVariance - a.totalVariance)[0];

  return (
    <div className="space-y-4">
      {/* Year Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{year} Overview</CardTitle>
          <CardDescription>Annual budget summary and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Annual Budget</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totalBudget)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totalActual)}</TableCell>
                <TableCell className={cn('text-right font-bold tabular-nums', varianceClass(totalVariance))}>
                  {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Average/Month</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(avgMonthlyBudget)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(avgMonthlyActual)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalVariance <= 0 ? 'Under budget' : 'Over budget'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Best and Challenging Months */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <TrendingDown className="h-5 w-5" /> Best Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!bestMonth && (
              <p className="text-sm text-muted-foreground">No spending recorded this year yet.</p>
            )}
            {bestMonth && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Month</div>
                  <div className="text-xl font-bold">{getMonthName(bestMonth.month)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {bestMonth.totalVariance > 0 ? 'Over Budget' : 'Under Budget'}
                  </div>
                  <div className={`text-xl font-bold ${bestMonth.totalVariance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(Math.abs(bestMonth.totalVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Budget</div>
                  <div className="text-base font-semibold">{formatCurrency(bestMonth.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Spent</div>
                  <div className="text-base font-semibold">{formatCurrency(bestMonth.totalActual)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingUp className="h-5 w-5" /> Challenging Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!worstMonth && (
              <p className="text-sm text-muted-foreground">No spending recorded this year yet.</p>
            )}
            {worstMonth && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Month</div>
                  <div className="text-xl font-bold">{getMonthName(worstMonth.month)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {worstMonth.totalVariance > 0 ? 'Over Budget' : 'Under Budget'}
                  </div>
                  <div className={`text-xl font-bold ${worstMonth.totalVariance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(Math.abs(worstMonth.totalVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Budget</div>
                  <div className="text-base font-semibold">{formatCurrency(worstMonth.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Spent</div>
                  <div className="text-base font-semibold">{formatCurrency(worstMonth.totalActual)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Detailed month-by-month performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">% Used</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearData.map((month) => {
                const percentUsed = month.totalBudget > 0
                  ? (month.totalActual / month.totalBudget) * 100
                  : 0;
                const status = getStatus(month.totalActual, percentUsed);

                return (
                  <TableRow key={month.month}>
                    <TableCell className="font-semibold">{getMonthName(month.month)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(month.totalBudget)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(month.totalActual)}</TableCell>
                    <TableCell className={cn('text-right font-semibold tabular-nums', varianceClass(month.totalVariance))}>
                      {month.totalVariance > 0 ? '+' : ''}
                      {formatCurrency(month.totalVariance)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{percentUsed.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="text-base font-bold hover:bg-transparent">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totalBudget)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totalActual)}</TableCell>
                <TableCell className={cn('text-right tabular-nums', varianceClass(totalVariance))}>
                  {totalVariance > 0 ? '+' : ''}
                  {formatCurrency(totalVariance)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
