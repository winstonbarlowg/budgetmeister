import { RawTransaction, CategorizedTransaction, Category, CategorizationRule } from '../types';

// UK-specific merchant patterns (built-in rules)
export const UK_MERCHANT_PATTERNS: Record<string, RegExp[]> = {
  'groceries': [
    /tesco/i, /sainsbury/i, /asda/i, /morrisons/i, /aldi/i, /lidl/i,
    /waitrose/i, /m&s.*food/i, /marks.*spencer/i, /co-op/i, /iceland/i,
    /ocado/i, /whole foods/i
  ],
  'transport': [
    /tfl\.gov\.uk/i, /tfl /i, /trainline/i, /uber/i, /bolt/i, /national rail/i,
    /santander cycles/i, /oyster/i, /gwr/i, /lner/i, /avanti/i,
    /scotrail/i, /crosscountry/i
  ],
  'eating-out': [
    /deliveroo/i, /uber eats/i, /just eat/i, /pret/i, /greggs/i,
    /nando's/i, /nandos/i, /wagamama/i, /pizza express/i, /costa/i,
    /starbucks/i, /mcdonald/i, /kfc/i, /subway/i, /domino/i
  ],
  'utilities': [
    /british gas/i, /eon/i, /edf/i, /thames water/i, /bt group/i,
    /sky/i, /virgin media/i, /vodafone/i, /ee limited/i, /o2/i,
    /three/i, /council tax/i
  ],
  'subscriptions': [
    /netflix/i, /spotify/i, /amazon prime/i, /apple\.com\/bill/i,
    /microsoft/i, /disney\+/i, /youtube premium/i, /adobe/i,
    /gym/i, /fitness/i
  ],
  'shopping': [
    /amazon/i, /ebay/i, /argos/i, /john lewis/i, /next/i, /zara/i,
    /h&m/i, /primark/i, /boots/i, /superdrug/i, /asos/i,
    /sports direct/i, /currys/i
  ],
  'entertainment': [
    /cinema/i, /odeon/i, /vue/i, /cineworld/i, /theatre/i,
    /ticketmaster/i, /see tickets/i, /eventbrite/i
  ]
};

// Normalize transaction description for matching
export function normalizeDescription(description: string): string {
  let normalized = description.toLowerCase();

  // Remove common prefixes
  normalized = normalized.replace(/^(card payment|cpc|dd|direct debit|fp|faster payment|so|standing order)\s+/gi, '');

  // Remove transaction IDs, dates, card numbers
  normalized = normalized.replace(/\d{10,}/g, ''); // Long numbers
  normalized = normalized.replace(/\d{2}\/\d{2}\/\d{4}/g, ''); // Dates
  normalized = normalized.replace(/\*+\d{4}/g, ''); // Masked card numbers

  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// Map pattern category names to actual category IDs
function findCategoryByName(patternName: string, categories: Category[]): string | null {
  // Try exact match first
  const exact = categories.find(c => c.name.toLowerCase() === patternName.toLowerCase());
  if (exact) return exact.id;

  // Try partial match
  const partial = categories.find(c =>
    c.name.toLowerCase().includes(patternName.toLowerCase()) ||
    patternName.toLowerCase().includes(c.name.toLowerCase())
  );
  if (partial) return partial.id;

  return null;
}

// Match transaction to category using built-in rules
export function matchBuiltInRules(
  description: string,
  categories: Category[]
): { categoryId: string; confidence: number } | null {
  const normalized = normalizeDescription(description);

  for (const [patternName, patterns] of Object.entries(UK_MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized) || pattern.test(description)) {
        const categoryId = findCategoryByName(patternName, categories);
        if (categoryId) {
          return { categoryId, confidence: 0.85 };
        }
      }
    }
  }

  return null;
}

// Calculate string similarity (simple Levenshtein distance-based)
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Match using learned rules
export function matchLearnedRules(
  description: string,
  rules: CategorizationRule[]
): { categoryId: string; confidence: number } | null {
  const normalized = normalizeDescription(description);

  let bestMatch: { categoryId: string; confidence: number } | null = null;
  let highestScore = 0;

  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();

    // Exact substring match
    if (normalized.includes(pattern) || description.toLowerCase().includes(pattern)) {
      const score = rule.confidence * (1 + Math.log(rule.frequency + 1) / 10);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { categoryId: rule.categoryId, confidence: Math.min(score, 0.95) };
      }
      continue;
    }

    // Fuzzy match
    const similarity = stringSimilarity(normalized, pattern);
    if (similarity > 0.7) {
      const score = similarity * rule.confidence * (1 + Math.log(rule.frequency + 1) / 10);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { categoryId: rule.categoryId, confidence: Math.min(score * 0.9, 0.9) };
      }
    }
  }

  return bestMatch;
}

// Main categorization function
export function categorizeTransaction(
  transaction: RawTransaction,
  categories: Category[],
  rules: CategorizationRule[]
): { categoryId: string; confidence: number } | null {
  // 1. Try user-defined rules (highest priority)
  const userRules = rules.filter(r => r.source === 'user');
  const userMatch = matchLearnedRules(transaction.description, userRules);
  if (userMatch && userMatch.confidence > 0.7) {
    return userMatch;
  }

  // 2. Try learned rules
  const learnedRules = rules.filter(r => r.source === 'learned');
  const learnedMatch = matchLearnedRules(transaction.description, learnedRules);
  if (learnedMatch && learnedMatch.confidence > 0.7) {
    return learnedMatch;
  }

  // 3. Try built-in UK merchant patterns
  const builtInMatch = matchBuiltInRules(transaction.description, categories);
  if (builtInMatch) {
    return builtInMatch;
  }

  // 4. No match found
  return null;
}

// Batch categorization
export function categorizeTransactions(
  transactions: RawTransaction[],
  categories: Category[],
  rules: CategorizationRule[]
): CategorizedTransaction[] {
  return transactions.map(transaction => {
    const match = categorizeTransaction(transaction, categories, rules);
    const merchantPattern = normalizeDescription(transaction.description);

    return {
      ...transaction,
      suggestedCategoryId: match?.categoryId,
      confidence: match?.confidence,
      finalCategoryId: undefined,
      merchantPattern,
      isReviewed: false,
      isApplied: false
    };
  });
}

// Learn from user corrections
export function learnFromCorrection(
  transaction: CategorizedTransaction,
  correctedCategoryId: string,
  existingRules: CategorizationRule[]
): CategorizationRule {
  const pattern = transaction.merchantPattern || normalizeDescription(transaction.description);

  // Check if rule already exists
  const existingRule = existingRules.find(
    r => r.pattern === pattern && r.categoryId === correctedCategoryId
  );

  if (existingRule) {
    // Update existing rule
    return {
      ...existingRule,
      frequency: existingRule.frequency + 1,
      confidence: Math.min(existingRule.confidence + 0.05, 0.95),
      lastUsed: new Date().toISOString()
    };
  }

  // Create new learned rule
  return {
    id: Date.now().toString(),
    pattern,
    categoryId: correctedCategoryId,
    confidence: 0.75, // Start with medium confidence
    source: 'learned',
    frequency: 1,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}
