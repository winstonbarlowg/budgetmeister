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
  // Months with no spending yet (e.g. the rest of this year) would otherwise look fully under budget
  const monthsWithSpending = yearData.filter(m => m.totalActual > 0);
  const sum = (pick: (m: MonthSummary) => number, months = monthsWithSpending) => months.reduce((total, m) => total + pick(m), 0);

  // Budgets apply to variable spending only; fixed costs are reported as they are
  const fixedTotal = sum(m => m.fixedActual);
  const variableTotal = sum(m => m.variableActual);
  const variableBudget = sum(m => m.variableBudget);
  const variableVariance = variableTotal - variableBudget;
  const totalActual = sum(m => m.totalActual);
  const activeMonths = monthsWithSpending.length || 1;

  const bestMonth = [...monthsWithSpending].sort((a, b) => a.variableVariance - b.variableVariance)[0];
  const worstMonth = [...monthsWithSpending].sort((a, b) => b.variableVariance - a.variableVariance)[0];

  return (
    <div className="space-y-4">
      {/* Year Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{year} Overview</CardTitle>
          <CardDescription>Fixed costs and variable spending against its budget</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Average/Month</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Fixed costs</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(fixedTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(fixedTotal / activeMonths)}</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Variable spending</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(variableBudget)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(variableTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(variableTotal / activeMonths)}</TableCell>
                <TableCell className={cn('text-right font-bold tabular-nums', varianceClass(variableVariance))}>
                  {variableVariance > 0 ? '+' : ''}{formatCurrency(variableVariance)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">All spending</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totalActual)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(totalActual / activeMonths)}</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            Totals cover the {monthsWithSpending.length} month{monthsWithSpending.length === 1 ? '' : 's'} with spending recorded. Fixed costs have no budget.
          </p>
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
                    {bestMonth.variableVariance > 0 ? 'Over Budget' : 'Under Budget'}
                  </div>
                  <div className={`text-xl font-bold ${bestMonth.variableVariance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(Math.abs(bestMonth.variableVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variable budget</div>
                  <div className="text-base font-semibold">{formatCurrency(bestMonth.variableBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variable spent</div>
                  <div className="text-base font-semibold">{formatCurrency(bestMonth.variableActual)}</div>
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
                    {worstMonth.variableVariance > 0 ? 'Over Budget' : 'Under Budget'}
                  </div>
                  <div className={`text-xl font-bold ${worstMonth.variableVariance > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(Math.abs(worstMonth.variableVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variable budget</div>
                  <div className="text-base font-semibold">{formatCurrency(worstMonth.variableBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variable spent</div>
                  <div className="text-base font-semibold">{formatCurrency(worstMonth.variableActual)}</div>
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
          <CardDescription>Fixed costs, and variable spending against its budget. Status is judged on variable spending.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Fixed Costs</TableHead>
                <TableHead className="text-right">Variable Spent</TableHead>
                <TableHead className="text-right">Variable Budget</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">% Used</TableHead>
                <TableHead className="text-right">All Spending</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearData.map((month) => {
                const percentUsed = month.variableBudget > 0
                  ? (month.variableActual / month.variableBudget) * 100
                  : 0;
                const status = getStatus(month.totalActual, percentUsed);
                const hasData = month.totalActual > 0;

                return (
                  <TableRow key={month.month}>
                    <TableCell className="font-semibold">{getMonthName(month.month)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(month.fixedActual)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(month.variableActual)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(month.variableBudget)}</TableCell>
                    <TableCell className={cn('text-right font-semibold tabular-nums', hasData ? varianceClass(month.variableVariance) : 'text-muted-foreground')}>
                      {hasData ? `${month.variableVariance > 0 ? '+' : ''}${formatCurrency(month.variableVariance)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{hasData ? `${percentUsed.toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(month.totalActual)}</TableCell>
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
                <TableCell className="text-right tabular-nums">{formatCurrency(fixedTotal)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(variableTotal)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(variableBudget)}</TableCell>
                <TableCell className={cn('text-right tabular-nums', varianceClass(variableVariance))}>
                  {variableVariance > 0 ? '+' : ''}
                  {formatCurrency(variableVariance)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {variableBudget > 0 ? ((variableTotal / variableBudget) * 100).toFixed(1) : 0}%
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totalActual)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
