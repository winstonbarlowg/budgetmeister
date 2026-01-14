import { useState } from 'react';
import { Category, IncomeSource } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CategoryManager } from './CategoryManager';
import { IncomeManager } from './IncomeManager';

interface SettingsManagerProps {
  categories: Category[];
  incomeSources: IncomeSource[];
  onSaveCategories: (categories: Category[]) => void;
  onSaveIncomeSources: (incomeSources: IncomeSource[]) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  categories,
  incomeSources,
  onSaveCategories,
  onSaveIncomeSources,
}) => {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Manage your budget categories and income sources</CardDescription>
        </CardHeader>
        <CardContent>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="income">Income Sources</TabsTrigger>
          </TabsList>
        </CardContent>
      </Card>

      <TabsContent value="categories" className="space-y-6">
        <CategoryManager categories={categories} onSave={onSaveCategories} />
      </TabsContent>

      <TabsContent value="income" className="space-y-6">
        <IncomeManager incomeSources={incomeSources} onSave={onSaveIncomeSources} />
      </TabsContent>
    </Tabs>
  );
};
