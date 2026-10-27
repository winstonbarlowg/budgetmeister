#!/usr/bin/env python3
"""Import an Emma transaction export (.xlsx) into a Budget Tracker data folder.

Usage:
    python3 scripts/import_emma.py <emma-export.xlsx> <budget-root-folder>

<budget-root-folder> is the folder you picked in the app (the one that contains
`budget-data/`). Requires openpyxl (`pip install openpyxl`).

What it does:
  * Stores every transaction in its month file (`budget-data/YYYY/MM-month.json`)
    under `transactions`, labelled with its source account (Amex / HSBC).
  * Maps Emma categories onto the app's categories, creating any that are missing.
  * Excludes transfers between your own accounts (Amex repayments, Revolut/Monzo/
    Lloyds top-ups, ...) and Amex instalment-plan adjustments by default.
  * Recalculates each month's imported expense totals from the included
    transactions, keeping any manual adjustments you entered in the app.

Safe to re-run with a newer export: transactions are matched by Emma ID, and any
category or exclusion you changed in the app (`userEdited`) is kept.
"""

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import openpyxl

INCOME_CATEGORY_ID = '__income'

# Emma category -> existing app category id
CATEGORY_MAP = {
    'Groceries': 'groceries',
    'Eating Out': 'dining',
    'Entertainment': 'entertainment',
    'Transport': 'transport',
    'Shopping': 'shopping',
    'Bills': 'utilities',
}

# Emma categories with no app equivalent are created with these settings
NEW_CATEGORY_COLORS = [
    '#64748b', '#ec4899', '#14b8a6', '#a855f7', '#eab308',
    '#0ea5e9', '#f43f5e', '#10b981', '#6366f1', '#d946ef',
]

# Counterparty rules that override Emma's category: (regex, app category id)
COUNTERPARTY_RULES = [
    (r'^HALIFAX$', 'rent'),                           # monthly mortgage direct debit
    (r'HOME INSURANCE|LEMONADE INSURANCE', 'insurance'),
    (r'LLOYDS BANK GI|DEPOSIT PROTECTION', INCOME_CATEGORY_ID),  # insurance payout, deposit returned
]

# Transfers to/from your own accounts. They move money around but are not spending.
OWN_TRANSFER_PATTERN = re.compile(
    r'BARLOW GRO|WINSTON GROVE|WINSTON BARLOW|REVOLUT\*\*|40237426|GLOBAL MONEY',
    re.IGNORECASE,
)

ACCOUNT_LABELS = {
    'American Express': 'Amex',
    'HSBC Bank': 'HSBC',
}


def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def month_file_name(year, month):
    return f"{month:02d}-{date(year, month, 1).strftime('%B').lower()}.json"


def merchant_key(counterparty):
    """Rough merchant identity, used to give Amex refunds the category of the original purchase."""
    words = re.sub(r'[^A-Z ]+', ' ', (counterparty or '').upper()).split()
    return ' '.join(words[:2])


def read_rows(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    rows = list(wb.worksheets[0].iter_rows(values_only=True))
    header = rows[0]
    return [dict(zip(header, r)) for r in rows[1:] if r and r[0]]


def to_iso_date(value):
    if isinstance(value, (datetime, date)):
        return value.strftime('%Y-%m-%d')
    return str(value)[:10]


def classify(row, category_ids, refund_categories):
    """Return (categoryId, excluded, excludeReason) for one Emma row."""
    counterparty = (row['Counterparty'] or '').strip()
    bank = row['Bank']
    amount = row['Amount']
    emma_category = row['Category']

    if emma_category == 'Excluded':
        return None, True, 'Amex repayment (transfer between your accounts)'

    if bank == 'American Express' and (
        (counterparty.upper().startswith('INSTALMENT PLAN') and amount > 0)
        or counterparty.upper().startswith('AMOUNT TRANSFERRED FROM CREDIT PLAN')
    ):
        return None, True, 'Amex instalment plan adjustment (original purchase already counted)'

    if OWN_TRANSFER_PATTERN.search(counterparty):
        return None, True, 'Transfer to/from your own account'

    for pattern, category_id in COUNTERPARTY_RULES:
        if re.search(pattern, counterparty, re.IGNORECASE):
            return category_id, False, None

    if emma_category == 'Income':
        if bank == 'American Express':
            # A credit on a card is a refund, not income
            return refund_categories.get(merchant_key(counterparty), 'general'), False, None
        return INCOME_CATEGORY_ID, False, None

    return category_ids[emma_category], False, None


def recalculate_expenses(month_data, transactions):
    """Mirror of recalculateImportedExpenses() in src/utils/monthTransactions.ts."""
    totals = defaultdict(float)
    ids = defaultdict(list)
    for t in transactions:
        if t['excluded'] or not t['categoryId'] or t['categoryId'] == INCOME_CATEGORY_ID:
            continue
        totals[t['categoryId']] += t['amount'] if t['direction'] == 'debit' else -t['amount']
        ids[t['categoryId']].append(t['id'])

    by_category = {e['categoryId']: e for e in month_data.get('expenses', [])}
    expenses = []
    for category_id in list(by_category) + [c for c in totals if c not in by_category]:
        manual = (by_category.get(category_id) or {}).get('manualAmount', 0) or 0
        imported = round(max(0.0, totals.get(category_id, 0.0)), 2)
        if imported == 0 and manual == 0:
            continue
        expenses.append({
            'categoryId': category_id,
            'actualAmount': round(imported + manual, 2),
            'importedAmount': imported,
            'manualAmount': manual,
            'linkedTransactionIds': ids.get(category_id, []),
        })
    return expenses


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    xlsx_path, root = Path(sys.argv[1]), Path(sys.argv[2])
    data_dir = root / 'budget-data'
    config_path = data_dir / 'config.json'
    if not config_path.exists():
        sys.exit(f'{config_path} not found - open the folder in the app once first.')

    rows = read_rows(xlsx_path)
    config = json.loads(config_path.read_text())

    # 1. Make sure every Emma category has an app category
    category_ids = {}
    existing = {c['id'] for c in config['categories']}
    created = []
    for emma_category in sorted({r['Category'] for r in rows} - {'Income', 'Excluded'}):
        category_id = CATEGORY_MAP.get(emma_category, slugify(emma_category))
        category_ids[emma_category] = category_id
        if category_id not in existing:
            config['categories'].append({
                'id': category_id,
                'name': emma_category,
                'type': 'variable',
                'budgetAmount': 0,
                'color': NEW_CATEGORY_COLORS[len(created) % len(NEW_CATEGORY_COLORS)],
            })
            existing.add(category_id)
            created.append(emma_category)
    if 'general' not in existing:  # fallback for unmatched refunds
        config['categories'].append({'id': 'general', 'name': 'General', 'type': 'variable',
                                     'budgetAmount': 0, 'color': NEW_CATEGORY_COLORS[0]})
        created.append('General')

    # 2. Most common purchase category per merchant, for refunds
    seen = defaultdict(Counter)
    for r in rows:
        if r['Amount'] < 0 and r['Category'] not in ('Income', 'Excluded'):
            seen[merchant_key(r['Counterparty'])][category_ids[r['Category']]] += 1
    refund_categories = {k: v.most_common(1)[0][0] for k, v in seen.items()}

    # 3. Build transactions grouped by month
    by_month = defaultdict(list)
    for r in rows:
        category_id, excluded, reason = classify(r, category_ids, refund_categories)
        iso = to_iso_date(r['Date'])
        txn = {
            'id': r['ID'],
            'date': iso,
            'description': (r['Custom Name'] or r['Counterparty'] or '').strip(),
            'merchant': r['Merchant'] or None,
            'amount': round(abs(r['Amount']), 2),
            'direction': 'debit' if r['Amount'] < 0 else 'credit',
            'account': ACCOUNT_LABELS.get(r['Bank'], r['Bank']),
            'accountName': r['Account'],
            'type': r['Type'],
            'categoryId': category_id,
            'sourceCategory': r['Category'],
            'excluded': excluded,
            'source': 'emma',
        }
        if reason:
            txn['excludeReason'] = reason
        by_month[(int(iso[:4]), int(iso[5:7]))].append(txn)

    # 4. Merge into month files
    summary = []
    for (year, month), new_txns in sorted(by_month.items()):
        path = data_dir / str(year) / month_file_name(year, month)
        path.parent.mkdir(parents=True, exist_ok=True)
        month_data = json.loads(path.read_text()) if path.exists() else {
            'year': year, 'month': month, 'expenses': [], 'income': [], 'moneyMovements': [],
        }
        month_data.setdefault('income', [])
        month_data.setdefault('moneyMovements', [])

        previous = {t['id']: t for t in month_data.get('transactions', [])}
        merged = {}
        for t in new_txns:
            old = previous.get(t['id'])
            if old and old.get('userEdited'):
                for key in ('categoryId', 'excluded', 'excludeReason', 'userEdited'):
                    if key in old:
                        t[key] = old[key]
                    else:
                        t.pop(key, None)
            merged[t['id']] = t
        for tid, old in previous.items():  # keep anything not in this export
            merged.setdefault(tid, old)

        transactions = sorted(merged.values(), key=lambda t: (t['date'], t['id']), reverse=True)
        month_data['transactions'] = transactions
        month_data['expenses'] = recalculate_expenses(month_data, transactions)
        path.write_text(json.dumps(month_data, indent=2, ensure_ascii=False))

        spent = sum(e['importedAmount'] for e in month_data['expenses'])
        excluded_count = sum(1 for t in transactions if t['excluded'])
        summary.append(f'  {year}-{month:02d}: {len(transactions):4} transactions, '
                       f'{excluded_count:3} excluded, £{spent:,.2f} spending')

    config['lastModified'] = datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
    config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False))

    print(f'Imported {len(rows)} transactions from {xlsx_path.name}')
    print(f"Created categories: {', '.join(created) or 'none'}")
    print('\n'.join(summary))


if __name__ == '__main__':
    main()
