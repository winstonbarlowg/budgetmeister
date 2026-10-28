import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, PiggyBank, TrendingUp } from 'lucide-react';
import { MonthData, MoneyMovement } from '../types';
import { Button } from './ui/button';
import { useConfirm } from './ui/confirm-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { formatCurrency } from '../utils/calculations';
import { MoneyInput } from './MoneyInput';

interface MonthlySavingsEntryProps {
  monthData: MonthData;
  onSave: (data: MonthData) => void;
}

const movementSchema = z
  .object({
    type: z.enum(['savings', 'investment']),
    amount: z.number().positive('Enter an amount above zero'),
    category: z.string().trim().min(1, 'Add a category'),
    sourceAccount: z.string().trim().min(1, 'Add the account the money comes from'),
    destinationAccount: z.string().trim().min(1, 'Add the account the money goes to'),
    notes: z.string(),
  })
  .refine(v => v.sourceAccount.trim().toLowerCase() !== v.destinationAccount.trim().toLowerCase(), {
    path: ['destinationAccount'],
    message: 'Source and destination must be different accounts',
  });

type MovementFormData = z.infer<typeof movementSchema>;

const EMPTY_MOVEMENT: MovementFormData = {
  type: 'savings',
  amount: 0,
  category: '',
  sourceAccount: '',
  destinationAccount: '',
  notes: '',
};

export const MonthlySavingsEntry: React.FC<MonthlySavingsEntryProps> = ({
  monthData,
  onSave,
}) => {
  const confirm = useConfirm();
  const movements = monthData.moneyMovements || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<MoneyMovement | null>(null);
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: EMPTY_MOVEMENT,
  });

  // Every add, edit and delete is saved straight away
  const saveMovements = (updated: MoneyMovement[]) => {
    onSave({ ...monthData, moneyMovements: updated });
  };

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
    form.reset(EMPTY_MOVEMENT);
    setIsDialogOpen(true);
  };

  const openEditDialog = (movement: MoneyMovement) => {
    setEditingMovement(movement);
    form.reset({
      type: movement.type,
      amount: movement.amount,
      category: movement.category,
      sourceAccount: movement.sourceAccount,
      destinationAccount: movement.destinationAccount,
      notes: movement.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: MovementFormData) => {
    const data = {
      ...values,
      category: values.category.trim(),
      sourceAccount: values.sourceAccount.trim(),
      destinationAccount: values.destinationAccount.trim(),
    };

    if (editingMovement) {
      // Edit existing movement
      const updated: MoneyMovement = {
        ...editingMovement,
        ...data,
      };
      saveMovements(movements.map(m => m.id === editingMovement.id ? updated : m));
    } else {
      // Add new movement
      const newMovement: MoneyMovement = {
        id: Date.now().toString(),
        ...data,
      };
      saveMovements([...movements, newMovement]);
    }

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
      saveMovements(movements.filter(m => m.id !== id));
    }
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
            <div className="text-center py-6 text-muted-foreground">
              <p>No money movements recorded for this month.</p>
              <p className="text-sm mt-2">Click "Add Movement" to start tracking your savings and investments.</p>
            </div>
          ) : (
            <>
              {/* Savings section */}
              {savingsMovements.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center text-success">
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
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center text-info">
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
              <div className="border-t pt-4">
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input list="movement-categories" placeholder="e.g., Emergency Fund, Retirement" {...field} />
                    </FormControl>
                    <datalist id="movement-categories">
                      {uniqueCategories.map(option => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Account</FormLabel>
                    <FormControl>
                      <Input list="source-accounts" placeholder="e.g., Current Account, Checking" {...field} />
                    </FormControl>
                    <datalist id="source-accounts">
                      {uniqueSourceAccounts.map(option => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Account</FormLabel>
                    <FormControl>
                      <Input list="dest-accounts" placeholder="e.g., Savings Account, ISA" {...field} />
                    </FormControl>
                    <datalist id="dest-accounts">
                      {uniqueDestAccounts.map(option => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Add any additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMovement ? 'Save Changes' : 'Add Movement'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
