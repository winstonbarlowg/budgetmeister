import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, PiggyBank, TrendingUp } from 'lucide-react';
import { MonthData, MoneyMovement } from '../types';
import { Button } from './ui/button';
import { useConfirm } from './ui/confirm-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { formatCurrency } from '../utils/calculations';
import { CurrencyInput } from './CurrencyInput';

interface MonthlySavingsEntryProps {
  monthData: MonthData;
  onSave: (data: MonthData) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

interface MovementFormData {
  type: 'savings' | 'investment';
  amount: number;
  category: string;
  sourceAccount: string;
  destinationAccount: string;
  notes: string;
}

export const MonthlySavingsEntry: React.FC<MonthlySavingsEntryProps> = ({
  monthData,
  onSave,
  onHasChangesChange,
}) => {
  const confirm = useConfirm();
  const [movements, setMovements] = useState<MoneyMovement[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<MoneyMovement | null>(null);
  const [formData, setFormData] = useState<MovementFormData>({
    type: 'savings',
    amount: 0,
    category: '',
    sourceAccount: '',
    destinationAccount: '',
    notes: '',
  });

  // Initialize from monthData
  useEffect(() => {
    setMovements(monthData.moneyMovements || []);
    setHasChanges(false);
  }, [monthData]);

  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges]);

  // Calculate totals
  const totalSavings = movements
    .filter(m => m.type === 'savings')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalInvestments = movements
    .filter(m => m.type === 'investment')
    .reduce((sum, m) => sum + m.amount, 0);

  // Extract unique values for autocomplete
  const uniqueCategories = Array.from(new Set(movements.map(m => m.category).filter(Boolean)));
  const uniqueSourceAccounts = Array.from(new Set(movements.map(m => m.sourceAccount).filter(Boolean)));
  const uniqueDestAccounts = Array.from(new Set(movements.map(m => m.destinationAccount).filter(Boolean)));

  const openAddDialog = () => {
    setEditingMovement(null);
    setFormData({
      type: 'savings',
      amount: 0,
      category: '',
      sourceAccount: '',
      destinationAccount: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (movement: MoneyMovement) => {
    setEditingMovement(movement);
    setFormData({
      type: movement.type,
      amount: movement.amount,
      category: movement.category,
      sourceAccount: movement.sourceAccount,
      destinationAccount: movement.destinationAccount,
      notes: movement.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.sourceAccount || !formData.destinationAccount || formData.amount <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    if (editingMovement) {
      // Edit existing movement
      const updated: MoneyMovement = {
        ...editingMovement,
        ...formData,
      };
      setMovements(movements.map(m => m.id === editingMovement.id ? updated : m));
    } else {
      // Add new movement
      const newMovement: MoneyMovement = {
        id: Date.now().toString(),
        ...formData,
      };
      setMovements([...movements, newMovement]);
    }

    setHasChanges(true);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete this movement?',
      description: 'This savings/investment movement will be removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      setMovements(movements.filter(m => m.id !== id));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    onSave({ ...monthData, moneyMovements: movements });
    setHasChanges(false);
  };

  const savingsMovements = movements.filter(m => m.type === 'savings');
  const investmentMovements = movements.filter(m => m.type === 'investment');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Savings & Investments</CardTitle>
              <CardDescription>Track money movements to savings and investment accounts</CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Movement
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No money movements recorded for this month.</p>
              <p className="text-sm mt-2">Click "Add Movement" to start tracking your savings and investments.</p>
            </div>
          ) : (
            <>
              {/* Savings section */}
              {savingsMovements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center text-success">
                    <PiggyBank className="mr-2 h-4 w-4" />
                    Savings
                  </h3>
                  <div className="space-y-2">
                    {savingsMovements.map(movement => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-success/5 border-success/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-success">{formatCurrency(movement.amount)}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm font-medium">{movement.category}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {movement.sourceAccount} → {movement.destinationAccount}
                          </div>
                          {movement.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {movement.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(movement)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(movement.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Investments section */}
              {investmentMovements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center text-info">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Investments
                  </h3>
                  <div className="space-y-2">
                    {investmentMovements.map(movement => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-info/5 border-info/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-info">{formatCurrency(movement.amount)}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm font-medium">{movement.category}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {movement.sourceAccount} → {movement.destinationAccount}
                          </div>
                          {movement.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {movement.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(movement)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(movement.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals footer */}
              <div className="border-t pt-4 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Savings:</span>{' '}
                  <span className="font-semibold text-success">{formatCurrency(totalSavings)}</span>
                  {' | '}
                  <span className="text-muted-foreground">Investments:</span>{' '}
                  <span className="font-semibold text-info">{formatCurrency(totalInvestments)}</span>
                  {' | '}
                  <span className="text-muted-foreground">Total:</span>{' '}
                  <span className="font-bold">{formatCurrency(totalSavings + totalInvestments)}</span>
                </div>
                <Button onClick={handleSave} disabled={!hasChanges}>
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMovement ? 'Edit Movement' : 'Add Money Movement'}</DialogTitle>
            <DialogDescription>
              {editingMovement ? 'Update the details of this money movement.' : 'Add a new savings or investment movement.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type selection */}
            <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: 'savings' | 'investment') => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="savings" />
                  <Label htmlFor="savings" className="font-normal cursor-pointer">
                    <PiggyBank className="inline h-4 w-4 mr-1" />
                    Savings
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="investment" id="investment" />
                  <Label htmlFor="investment" className="font-normal cursor-pointer">
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    Investment
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <CurrencyInput
                id="amount"
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                className="w-full"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                list="movement-categories"
                placeholder="e.g., Emergency Fund, Retirement"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <datalist id="movement-categories">
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Source Account */}
            <div className="space-y-2">
              <Label htmlFor="sourceAccount">Source Account *</Label>
              <Input
                id="sourceAccount"
                list="source-accounts"
                placeholder="e.g., Current Account, Checking"
                value={formData.sourceAccount}
                onChange={(e) => setFormData({ ...formData, sourceAccount: e.target.value })}
              />
              <datalist id="source-accounts">
                {uniqueSourceAccounts.map(account => (
                  <option key={account} value={account} />
                ))}
              </datalist>
            </div>

            {/* Destination Account */}
            <div className="space-y-2">
              <Label htmlFor="destinationAccount">Destination Account *</Label>
              <Input
                id="destinationAccount"
                list="dest-accounts"
                placeholder="e.g., Savings Account, ISA"
                value={formData.destinationAccount}
                onChange={(e) => setFormData({ ...formData, destinationAccount: e.target.value })}
              />
              <datalist id="dest-accounts">
                {uniqueDestAccounts.map(account => (
                  <option key={account} value={account} />
                ))}
              </datalist>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Add any additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingMovement ? 'Save Changes' : 'Add Movement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
