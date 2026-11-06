import { useState } from 'react';
import { Category, CategoryRule, IncomeSource, MonthData } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CategoryManager } from './CategoryManager';
import { IncomeManager } from './IncomeManager';
import { RuleManager } from './RuleManager';

interface SettingsManagerProps {
  categories: Category[];
  incomeSources: IncomeSource[];
  allMonths: MonthData[];
  rules: CategoryRule[];
  onSaveRules: (rules: CategoryRule[]) => Promise<void>;
  onSaveRule: (rule: CategoryRule) => Promise<void>;
  onSaveCategories: (categories: Category[]) => void;
  onSaveIncomeSources: (incomeSources: IncomeSource[]) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  categories,
  incomeSources,
  allMonths,
  rules,
  onSaveRules,
  onSaveRule,
  onSaveCategories,
  onSaveIncomeSources,
}) => {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
          <CardDescription>Manage your budget categories, rules and income sources</CardDescription>
        </CardHeader>
        <CardContent>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="income">Income Sources</TabsTrigger>
          </TabsList>
        </CardContent>
      </Card>

      <TabsContent value="categories" className="space-y-4">
        <CategoryManager categories={categories} onSave={onSaveCategories} />
      </TabsContent>

      <TabsContent value="rules" className="space-y-4">
        <RuleManager categories={categories} months={allMonths} rules={rules} onSaveRules={onSaveRules} onSaveRule={onSaveRule} />
      </TabsContent>

      <TabsContent value="income" className="space-y-4">
        <IncomeManager incomeSources={incomeSources} onSave={onSaveIncomeSources} />
      </TabsContent>
    </Tabs>
  );
};
