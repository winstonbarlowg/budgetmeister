import React from 'react';
import { MonthSummary } from '../types';
import { formatCurrency, getMonthName } from '../utils/calculations';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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

  const bestMonth = [...yearData].sort((a, b) => a.totalVariance - b.totalVariance)[0];
  const worstMonth = [...yearData].sort((a, b) => b.totalVariance - a.totalVariance)[0];

  return (
    <div className="space-y-6">
      {/* Year Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{year} Overview</CardTitle>
          <CardDescription>Annual budget summary and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Metric</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Annual Budget</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Spent</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Total</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '1.125rem', fontWeight: 600 }}>
                    {formatCurrency(totalBudget)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '1.125rem', fontWeight: 600 }}>
                    {formatCurrency(totalActual)}
                  </td>
                  <td style={{
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: totalVariance <= 0 ? '#059669' : '#dc2626'
                  }}>
                    {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Average/Month</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                    {formatCurrency(avgMonthlyBudget)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                    {formatCurrency(avgMonthlyActual)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                    {totalVariance <= 0 ? 'Under budget' : 'Over budget'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Best and Challenging Months */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <TrendingDown className="h-5 w-5" /> Best Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestMonth && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Month</div>
                  <div className="text-2xl font-bold">{getMonthName(bestMonth.month)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Under Budget</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(Math.abs(bestMonth.totalVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Budget</div>
                  <div className="text-lg font-semibold">{formatCurrency(bestMonth.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Spent</div>
                  <div className="text-lg font-semibold">{formatCurrency(bestMonth.totalActual)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingUp className="h-5 w-5" /> Challenging Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worstMonth && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Month</div>
                  <div className="text-2xl font-bold">{getMonthName(worstMonth.month)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {worstMonth.totalVariance > 0 ? 'Over Budget' : 'Under Budget'}
                  </div>
                  <div className={`text-2xl font-bold ${worstMonth.totalVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Math.abs(worstMonth.totalVariance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Budget</div>
                  <div className="text-lg font-semibold">{formatCurrency(worstMonth.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Spent</div>
                  <div className="text-lg font-semibold">{formatCurrency(worstMonth.totalActual)}</div>
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
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Budget</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actual</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Variance</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>% Used</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {yearData.map((month) => {
                const percentUsed = month.totalBudget > 0
                  ? (month.totalActual / month.totalBudget) * 100
                  : 0;

                return (
                  <tr key={month.month} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      {getMonthName(month.month)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {formatCurrency(month.totalBudget)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {formatCurrency(month.totalActual)}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        color: month.totalVariance <= 0 ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {month.totalVariance > 0 ? '+' : ''}
                      {formatCurrency(month.totalVariance)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {percentUsed.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {month.totalActual === 0 ? (
                        <span style={{ color: '#9ca3af' }}>No data</span>
                      ) : percentUsed <= 90 ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Great</span>
                      ) : percentUsed <= 100 ? (
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Good</span>
                      ) : percentUsed <= 110 ? (
                        <span style={{ color: '#f97316', fontWeight: 600 }}>Caution</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Over</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700, fontSize: '1.1rem' }}>
                <td style={{ padding: '1rem' }}>Total</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {formatCurrency(totalBudget)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {formatCurrency(totalActual)}
                </td>
                <td
                  style={{
                    padding: '1rem',
                    textAlign: 'right',
                    color: totalVariance <= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {totalVariance > 0 ? '+' : ''}
                  {formatCurrency(totalVariance)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
