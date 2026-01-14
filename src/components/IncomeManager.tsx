import { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { IncomeSource } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { formatCurrency, validateIncomeAmounts } from '../utils/calculations';

interface IncomeManagerProps {
  incomeSources: IncomeSource[];
  onSave: (incomeSources: IncomeSource[]) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomeSources, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: PRESET_COLORS[0],
    startDate: '',
    endDate: '',
    defaultGross: 0,
    defaultPension: 0,
    defaultNI: 0,
    defaultTax: 0,
    defaultNet: 0,
  });
  const [validationWarning, setValidationWarning] = useState('');

  const handleAdd = () => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    setEditingSource(null);
    setFormData({
      name: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      startDate: currentYearMonth,
      endDate: '',
      defaultGross: 0,
      defaultPension: 0,
      defaultNI: 0,
      defaultTax: 0,
      defaultNet: 0,
    });
    setValidationWarning('');
    setIsModalOpen(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      color: source.color || PRESET_COLORS[0],
      startDate: source.startDate,
      endDate: source.endDate || '',
      defaultGross: source.defaultGross,
      defaultPension: source.defaultPension,
      defaultNI: source.defaultNI,
      defaultTax: source.defaultTax,
      defaultNet: source.defaultNet,
    });
    setValidationWarning('');
    setIsModalOpen(true);
  };

  const handleDelete = (sourceId: string) => {
    if (confirm('Are you sure you want to delete this income source?')) {
      onSave(incomeSources.filter((s) => s.id !== sourceId));
    }
  };

  const validateForm = (): boolean => {
    // Validate dates
    if (formData.endDate && formData.endDate < formData.startDate) {
      setValidationWarning('End date must be after start date');
      return false;
    }

    // Validate amounts
    const validation = validateIncomeAmounts(
      formData.defaultGross,
      formData.defaultPension,
      formData.defaultNI,
      formData.defaultTax,
      formData.defaultNet
    );

    if (!validation.isValid) {
      setValidationWarning(
        `Warning: Net amount should be ${formatCurrency(validation.expectedNet)} based on deductions`
      );
      // Don't block saving, just warn
    } else {
      setValidationWarning('');
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const newSource: IncomeSource = {
      id: editingSource?.id || formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: formData.name,
      color: formData.color,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      defaultGross: formData.defaultGross,
      defaultPension: formData.defaultPension,
      defaultNI: formData.defaultNI,
      defaultTax: formData.defaultTax,
      defaultNet: formData.defaultNet,
    };

    if (editingSource) {
      onSave(incomeSources.map((s) => (s.id === editingSource.id ? newSource : s)));
    } else {
      onSave([...incomeSources, newSource]);
    }

    setIsModalOpen(false);
  };

  const formatDateRange = (startDate: string, endDate: string | null): string => {
    const start = new Date(startDate + '-01');
    const startStr = start.toLocaleString('en', { month: 'short', year: 'numeric' });

    if (!endDate) {
      return `${startStr} - Ongoing`;
    }

    const end = new Date(endDate + '-01');
    const endStr = end.toLocaleString('en', { month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const totalGross = incomeSources.reduce((sum, s) => sum + s.defaultGross, 0);
  const totalNet = incomeSources.reduce((sum, s) => sum + s.defaultNet, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Income Sources</CardTitle>
              <CardDescription>
                Manage your income streams with date ranges and default amounts
              </CardDescription>
            </div>
            <Button onClick={handleAdd} size="lg">
              <Plus className="h-5 w-5" /> Add Income Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incomeSources.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
                <p className="mb-2 font-semibold">No income sources defined yet</p>
                <p>Click "Add Income Source" to set up your first income stream</p>
              </div>
            ) : (
              <>
                {incomeSources.map((source) => (
                  <div
                    key={source.id}
                    className="group relative flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                  >
                    <div
                      className="h-16 w-1 rounded-full"
                      style={{ backgroundColor: source.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-lg">{source.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            {formatDateRange(source.startDate, source.endDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {formatCurrency(source.defaultNet)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Gross: {formatCurrency(source.defaultGross)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Pension: {formatCurrency(source.defaultPension)}</div>
                        <div>NI: {formatCurrency(source.defaultNI)}</div>
                        <div>Tax: {formatCurrency(source.defaultTax)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(source)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(source.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Total Summary */}
                <div className="mt-6 rounded-lg bg-muted/50 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Monthly Gross</div>
                      <div className="text-2xl font-semibold text-primary">
                        {formatCurrency(totalGross)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Monthly Net</div>
                      <div className="text-2xl font-semibold text-success">
                        {formatCurrency(totalNet)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Income Source' : 'Add New Income Source'}
            </DialogTitle>
            <DialogDescription>
              Define an income source with date range and default monthly amounts
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Income Source Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Salary, Freelance, Benefits"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  placeholder="Leave empty for ongoing"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-semibold">Monthly Income Breakdown</h4>

              <div className="space-y-2">
                <Label htmlFor="gross">Gross Income</Label>
                <Input
                  id="gross"
                  type="number"
                  value={formData.defaultGross}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultGross: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pension">Pension</Label>
                  <Input
                    id="pension"
                    type="number"
                    value={formData.defaultPension}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultPension: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ni">National Insurance</Label>
                  <Input
                    id="ni"
                    type="number"
                    value={formData.defaultNI}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultNI: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax">Tax</Label>
                  <Input
                    id="tax"
                    type="number"
                    value={formData.defaultTax}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultTax: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="net">Net Take-Home Pay</Label>
                <Input
                  id="net"
                  type="number"
                  value={formData.defaultNet}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultNet: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {validationWarning && (
                <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                  {validationWarning}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-10 w-10 rounded-lg transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      border: formData.color === color ? '3px solid #000' : '1px solid #e5e7eb',
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSource ? 'Save Changes' : 'Add Income Source'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
