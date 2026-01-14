# Budget Tracker

A powerful, file-based budget tracking application designed for couples to manage their monthly finances together. Built with React, TypeScript, and the File System Access API.

## Features

### File-Based Storage
- All data stored in simple JSON files
- Easy to sync via Dropbox, Google Drive, or any shared folder
- Human-readable format - you can even edit files manually if needed
- Works like Obsidian - just point to a directory

### Category Management
- Create custom budget categories
- Organize as Fixed (recurring) or Variable expenses
- Easy to edit, delete, and customize with colors
- Default categories included to get started quickly

### Monthly Entry
- Quick data entry interface for recording expenses
- Visual progress bars showing budget usage
- Real-time calculation of variances
- Navigate between months easily
- Auto-save functionality

### Powerful Visualizations

1. **Budget vs Actual Comparison** - Side-by-side bars showing planned vs actual spending
2. **Spending by Category** - Donut chart revealing where your money goes
3. **Fixed vs Variable Split** - Understand your committed vs discretionary spending
4. **Monthly Trend Line** - Track spending patterns across the year
5. **Category Variance** - See which categories are over/under budget
6. **YTD Progress Gauge** - Check if you're on track for the year
7. **Category Performance Heatmap** - Color-coded grid showing patterns over time

### Yearly Dashboard
- Complete overview of the entire year
- Monthly breakdown table with status indicators
- Identify best and worst months
- Annual totals and averages

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- A modern web browser (Chrome, Edge, or Opera recommended for File System API support)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

### First-Time Setup

1. Click "Open Budget Directory" on the welcome screen
2. Choose a folder where you want to store your budget data
3. The app will create a `budget-data` folder with:
   - `config.json` - Your categories and settings
   - Year folders (e.g., `2026/`) containing monthly data files

### Sharing with Your Partner

1. Store the budget directory in a shared location:
   - Dropbox
   - Google Drive
   - iCloud Drive
   - OneDrive
   - Network shared folder

2. Both partners open the app and point to the same directory
3. Changes are saved immediately to the shared files
4. Refresh the app to see updates made by your partner

## Usage Guide

### Adding/Editing Categories

1. Go to the "Categories" tab
2. Click "Add Category" or edit existing ones
3. Set the category name, type (fixed/variable), and monthly budget
4. Choose a color for easy identification
5. Changes are saved automatically

### Entering Monthly Expenses

1. Navigate to "Monthly Entry" tab
2. Use the arrows to select the current month
3. Enter actual amounts spent for each category
4. Watch the progress bars update in real-time
5. Click "Save Changes" when done

### Reviewing Analytics

1. Go to "Analytics" tab to see all 7 visualizations
2. Charts update based on the current month selected in Monthly Entry
3. Use these insights to identify spending patterns and areas for improvement

### Yearly Overview

1. Visit "Yearly Overview" tab
2. See the complete picture of your annual finances
3. Identify seasonal patterns and trends
4. Compare months to find opportunities for savings

## Data Structure

Your budget data is stored in this structure:

```
budget-data/
  ├── config.json              # Categories and settings
  └── 2026/
      ├── 01-january.json      # January expenses
      ├── 02-february.json     # February expenses
      └── ...
```

### Example config.json
```json
{
  "categories": [
    {
      "id": "rent",
      "name": "Rent/Mortgage",
      "type": "fixed",
      "budgetAmount": 1500,
      "color": "#ef4444"
    }
  ],
  "lastModified": "2026-01-12T10:30:00.000Z"
}
```

### Example month file (01-january.json)
```json
{
  "year": 2026,
  "month": 1,
  "expenses": [
    {
      "categoryId": "rent",
      "actualAmount": 1500
    }
  ]
}
```

## Tips for Success

1. **Regular Updates**: Update your budget weekly or bi-weekly for best results
2. **Monthly Reviews**: Review together at month-end to discuss patterns and adjust
3. **Be Realistic**: Set achievable budget amounts based on past spending
4. **Use Categories Wisely**: Too many categories = complexity, too few = lack of insight
5. **Track Everything**: Even small expenses add up - record them all
6. **Sync Regularly**: Make sure both partners have the latest data

## Browser Compatibility

The File System Access API is currently supported in:
- Chrome 86+
- Edge 86+
- Opera 72+

For other browsers, you may need to manually export/import JSON files.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory. You can serve these with any static file server.

## Troubleshooting

### Files not syncing?
- Make sure both partners are pointing to the same directory
- Check that your cloud sync service is running
- Try refreshing the app to reload data

### Can't select directory?
- Ensure you're using a supported browser
- Try a different folder location
- Check file system permissions

### Data looks wrong?
- Verify the JSON files are properly formatted
- Check that category IDs match between config and month files
- Look for any error messages in the browser console

## Technical Details

- **Framework**: React 18 with TypeScript
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Storage**: File System Access API

## License

This is a personal finance tool. Feel free to modify and customize for your needs.

## Support

For questions or issues, review the code comments or check the browser console for error messages.
