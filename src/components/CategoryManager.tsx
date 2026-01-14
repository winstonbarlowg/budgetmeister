import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Category } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatCurrency } from '../utils/calculations';

interface CategoryManagerProps {
  categories: Category[];
  onSave: (categories: Category[]) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'variable' as 'fixed' | 'variable',
    budgetAmount: 0,
    color: PRESET_COLORS[0],
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'variable',
      budgetAmount: 0,
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      budgetAmount: category.budgetAmount,
      color: category.color || PRESET_COLORS[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      onSave(categories.filter((c) => c.id !== categoryId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      onSave(
        categories.map((c) =>
          c.id === editingCategory.id ? { ...c, ...formData } : c
        )
      );
    } else {
      const newCategory: Category = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        ...formData,
      };
      onSave([...categories, newCategory]);
    }

    setIsModalOpen(false);
  };

  const fixedCategories = categories.filter((c) => c.type === 'fixed');
  const variableCategories = categories.filter((c) => c.type === 'variable');

  const fixedTotal = fixedCategories.reduce((sum, c) => sum + c.budgetAmount, 0);
  const variableTotal = variableCategories.reduce((sum, c) => sum + c.budgetAmount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Budget Categories</CardTitle>
              <CardDescription>Manage your monthly budget categories and amounts</CardDescription>
            </div>
            <Button onClick={handleAdd} size="lg">
              <Plus className="h-5 w-5" /> Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Fixed Expenses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fixed Expenses</h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {formatCurrency(fixedTotal)}/mo
                </span>
              </div>
              <div className="space-y-3">
                {fixedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="group relative flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                  >
                    <div
                      className="h-12 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(category.budgetAmount)} per month
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {fixedCategories.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                    No fixed expenses yet. Click "Add Category" to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Variable Expenses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Variable Expenses</h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {formatCurrency(variableTotal)}/mo
                </span>
              </div>
              <div className="space-y-3">
                {variableCategories.map((category) => (
                  <div
                    key={category.id}
                    className="group relative flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                  >
                    <div
                      className="h-12 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(category.budgetAmount)} per month
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {variableCategories.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                    No variable expenses yet. Click "Add Category" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="mt-6 rounded-lg bg-muted/50 p-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total Monthly Budget</span>
              <span className="text-2xl text-primary">{formatCurrency(fixedTotal + variableTotal)}</span>
            </div>
            <div className="mt-2 flex gap-6 text-sm text-muted-foreground">
              <span>Fixed: {formatCurrency(fixedTotal)}</span>
              <span>Variable: {formatCurrency(variableTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the details for this budget category.'
                : 'Create a new budget category to track your expenses.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Groceries"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'fixed' | 'variable') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed - Same amount every month</SelectItem>
                  <SelectItem value="variable">Variable - Changes each month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budgetAmount}
                onChange={(e) =>
                  setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
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
              <Button type="submit">{editingCategory ? 'Save Changes' : 'Add Category'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
