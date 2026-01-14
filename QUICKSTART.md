# Quick Start Guide

Get your budget tracker running in 5 minutes!

## Step 1: Start the App (30 seconds)

```bash
npm install
npm run dev
```

Open your browser to `http://localhost:5173`

## Step 2: Select Your Budget Folder (1 minute)

1. Click "Open Budget Directory"
2. Choose a folder (or create a new one called "BudgetData")
3. If using a shared folder with your wife, select your Dropbox/Google Drive folder

The app will create a `budget-data` folder inside with default categories.

## Step 3: Customize Categories (2 minutes)

1. Click the "Categories" tab
2. Edit the default categories or add your own:
   - Fixed: Rent, utilities, insurance, subscriptions
   - Variable: Groceries, dining, entertainment, shopping
3. Set realistic monthly budget amounts
4. Choose colors to make them easy to identify

## Step 4: Enter Your First Month (1 minute)

1. Go to "Monthly Entry" tab
2. Enter the amounts you've spent this month in each category
3. Watch the progress bars and totals update
4. Click "Save Changes"

## Step 5: Explore Insights (30 seconds)

1. Click "Analytics" to see your 7 visualizations
2. Click "Yearly Overview" to see the full year at a glance

## For Your Wife

Share these simple steps:

1. Open the app: `npm run dev` in the budget-tracker folder
2. Click "Open Budget Directory"
3. Select the same shared folder you're using
4. That's it! You'll see all the same data

## Weekly Routine

**Option 1: Real-time updates**
- Add expenses as they happen throughout the week
- 5 minutes per week

**Option 2: Weekly batch**
- Review bank statements once per week
- Update all categories at once
- 15-20 minutes per week

## Monthly Review Meeting

Spend 15 minutes together at month-end:

1. Review Analytics tab:
   - Which categories went over budget?
   - Any surprises in the spending breakdown?

2. Check Yearly Overview:
   - How does this month compare to others?
   - Are we trending in the right direction?

3. Adjust next month's budget if needed:
   - Go to Categories tab
   - Update budget amounts based on learnings

## Tips

- **Be consistent**: Update weekly, not monthly
- **Be honest**: Record all expenses, even small ones
- **Be flexible**: Adjust budgets as life changes
- **Celebrate wins**: When you're under budget, acknowledge it!
- **Learn from overspending**: Don't beat yourselves up, just adjust

## File Structure

Your data lives here:
```
YourSharedFolder/
  └── budget-data/
      ├── config.json          ← Categories and budgets
      └── 2026/
          ├── 01-january.json  ← Monthly expenses
          ├── 02-february.json
          └── ...
```

You can even edit these JSON files directly if needed!

## Troubleshooting

**App won't start?**
- Make sure you ran `npm install` first
- Check that Node.js is installed: `node --version`

**Can't see partner's changes?**
- Make sure you're both using the same folder
- Refresh the page to reload data
- Check that cloud sync is working

**Lost data?**
- Check the budget-data folder - files are still there
- Point the app to the correct folder again

## Next Steps

- Set up automatic cloud sync for your chosen folder
- Create a monthly calendar reminder for your review meeting
- Bookmark the app URL for easy access
- Consider setting financial goals based on insights

Happy budgeting! 💰
