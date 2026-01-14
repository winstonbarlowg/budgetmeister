# Sample Data for Testing

If you want to test the app with realistic data before entering your own, here are sample files you can create manually in your `budget-data` folder.

## Default config.json

The app creates this automatically, but here's what it looks like:

```json
{
  "categories": [
    {
      "id": "rent",
      "name": "Rent/Mortgage",
      "type": "fixed",
      "budgetAmount": 1500,
      "color": "#ef4444"
    },
    {
      "id": "utilities",
      "name": "Utilities",
      "type": "fixed",
      "budgetAmount": 200,
      "color": "#f97316"
    },
    {
      "id": "insurance",
      "name": "Insurance",
      "type": "fixed",
      "budgetAmount": 150,
      "color": "#f59e0b"
    },
    {
      "id": "groceries",
      "name": "Groceries",
      "type": "variable",
      "budgetAmount": 600,
      "color": "#84cc16"
    },
    {
      "id": "dining",
      "name": "Dining Out",
      "type": "variable",
      "budgetAmount": 300,
      "color": "#22c55e"
    },
    {
      "id": "entertainment",
      "name": "Entertainment",
      "type": "variable",
      "budgetAmount": 200,
      "color": "#06b6d4"
    },
    {
      "id": "transport",
      "name": "Transportation",
      "type": "variable",
      "budgetAmount": 250,
      "color": "#3b82f6"
    },
    {
      "id": "shopping",
      "name": "Shopping",
      "type": "variable",
      "budgetAmount": 300,
      "color": "#8b5cf6"
    }
  ],
  "lastModified": "2026-01-12T00:00:00.000Z"
}
```

## Sample Month Files

Create a `2026` folder in your `budget-data` directory and add these files:

### 2026/01-january.json (Good month - under budget)

```json
{
  "year": 2026,
  "month": 1,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 185 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 550 },
    { "categoryId": "dining", "actualAmount": 220 },
    { "categoryId": "entertainment", "actualAmount": 180 },
    { "categoryId": "transport", "actualAmount": 230 },
    { "categoryId": "shopping", "actualAmount": 200 }
  ]
}
```

### 2026/02-february.json (Over budget on variable expenses)

```json
{
  "year": 2026,
  "month": 2,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 195 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 680 },
    { "categoryId": "dining", "actualAmount": 420 },
    { "categoryId": "entertainment", "actualAmount": 275 },
    { "categoryId": "transport", "actualAmount": 310 },
    { "categoryId": "shopping", "actualAmount": 450 }
  ]
}
```

### 2026/03-march.json (Great month - well under budget)

```json
{
  "year": 2026,
  "month": 3,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 170 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 520 },
    { "categoryId": "dining", "actualAmount": 180 },
    { "categoryId": "entertainment", "actualAmount": 120 },
    { "categoryId": "transport", "actualAmount": 200 },
    { "categoryId": "shopping", "actualAmount": 150 }
  ]
}
```

### 2026/04-april.json (Average month)

```json
{
  "year": 2026,
  "month": 4,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 190 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 600 },
    { "categoryId": "dining", "actualAmount": 310 },
    { "categoryId": "entertainment", "actualAmount": 195 },
    { "categoryId": "transport", "actualAmount": 255 },
    { "categoryId": "shopping", "actualAmount": 290 }
  ]
}
```

### 2026/05-may.json (Vacation month - over budget)

```json
{
  "year": 2026,
  "month": 5,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 180 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 550 },
    { "categoryId": "dining", "actualAmount": 580 },
    { "categoryId": "entertainment", "actualAmount": 450 },
    { "categoryId": "transport", "actualAmount": 420 },
    { "categoryId": "shopping", "actualAmount": 380 }
  ]
}
```

### 2026/06-june.json (Recovery month)

```json
{
  "year": 2026,
  "month": 6,
  "expenses": [
    { "categoryId": "rent", "actualAmount": 1500 },
    { "categoryId": "utilities", "actualAmount": 205 },
    { "categoryId": "insurance", "actualAmount": 150 },
    { "categoryId": "groceries", "actualAmount": 580 },
    { "categoryId": "dining", "actualAmount": 250 },
    { "categoryId": "entertainment", "actualAmount": 160 },
    { "categoryId": "transport", "actualAmount": 240 },
    { "categoryId": "shopping", "actualAmount": 220 }
  ]
}
```

## What These Samples Show

With this sample data, you can see:

1. **Monthly variations** - How spending fluctuates month to month
2. **Category patterns** - Fixed expenses stay constant, variable ones change
3. **Overspending scenarios** - February and May show over-budget situations
4. **Recovery periods** - March and June show tightening the budget
5. **Trend analysis** - The charts will show clear patterns

## Using Sample Data

1. Create the folder structure:
   ```
   budget-data/
   ├── config.json
   └── 2026/
       ├── 01-january.json
       ├── 02-february.json
       ├── 03-march.json
       ├── 04-april.json
       ├── 05-may.json
       └── 06-june.json
   ```

2. Copy the JSON content into each file

3. Open the app and point to the parent folder containing `budget-data`

4. Explore all the features with realistic data!

## Creating Empty Month Files

For months with no data yet, create empty expense arrays:

```json
{
  "year": 2026,
  "month": 7,
  "expenses": []
}
```

The app will automatically create these when you save, but you can pre-create them if you want.
