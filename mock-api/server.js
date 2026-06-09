import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Load all records into memory once — mutations are in-memory only
let policies = JSON.parse(readFileSync(join(__dirname, 'db.json'), 'utf-8'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function applyFilters(records, query) {
  const {
    search,
    status,
    region,
    lineOfBusiness,
    currency,
    flaggedForReview,
    premiumMin,
    premiumMax,
    effectiveDateFrom,
    effectiveDateTo,
    expiryDateFrom,
    expiryDateTo
  } = query;

  let result = records;

  // Free-text OR search across policyNumber, policyHolderName, underwriter
  if (search) {
    const term = search.toLowerCase();
    result = result.filter(p =>
      p.policyNumber.toLowerCase().includes(term) ||
      p.policyHolderName.toLowerCase().includes(term) ||
      p.underwriter.toLowerCase().includes(term)
    );
  }

  const statuses = parseArray(status);
  if (statuses.length) result = result.filter(p => statuses.includes(p.status));

  const regions = parseArray(region);
  if (regions.length) result = result.filter(p => regions.includes(p.region));

  const lobs = parseArray(lineOfBusiness);
  if (lobs.length) result = result.filter(p => lobs.includes(p.lineOfBusiness));

  const currencies = parseArray(currency);
  if (currencies.length) result = result.filter(p => currencies.includes(p.currency));

  if (flaggedForReview !== undefined && flaggedForReview !== '') {
    const flag = flaggedForReview === 'true';
    result = result.filter(p => p.flaggedForReview === flag);
  }

  if (premiumMin) result = result.filter(p => p.premiumAmount >= Number(premiumMin));
  if (premiumMax) result = result.filter(p => p.premiumAmount <= Number(premiumMax));

  if (effectiveDateFrom) result = result.filter(p => p.effectiveDate >= effectiveDateFrom);
  if (effectiveDateTo)   result = result.filter(p => p.effectiveDate <= effectiveDateTo);
  if (expiryDateFrom)    result = result.filter(p => p.expiryDate >= expiryDateFrom);
  if (expiryDateTo)      result = result.filter(p => p.expiryDate <= expiryDateTo);

  return result;
}

function applySort(records, sort, order) {
  if (!sort) return records;
  const dir = order === 'desc' ? -1 : 1;
  return [...records].sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /policies — filter + search + sort + paginate
app.get('/policies', (req, res) => {
  const { sort, order, page = '1', pageSize = '20', ...filterQuery } = req.query;

  const filtered = applyFilters(policies, filterQuery);
  const sorted   = applySort(filtered, sort, order);

  const pageNum  = Math.max(1, parseInt(page, 10));
  const size     = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
  const start    = (pageNum - 1) * size;
  const data     = sorted.slice(start, start + size);

  res.json({ data, total: filtered.length });
});

// GET /policies/summary — aggregates over same filters (must be before /:id)
app.get('/policies/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sort, order, page, pageSize, ...filterQuery } = req.query;
  const filtered = applyFilters(policies, filterQuery);

  const summary = {
    active:   filtered.filter(p => p.status === 'Active').length,
    pending:  filtered.filter(p => p.status === 'Pending').length,
    expired:  filtered.filter(p => p.status === 'Expired').length,
    cancelled: filtered.filter(p => p.status === 'Cancelled').length,
    totalPremium: filtered.reduce((sum, p) => sum + p.premiumAmount, 0),
    expiringWithin30Days: filtered.filter(
      p => p.status === 'Active' && p.expiryDate >= today && p.expiryDate <= in30Days
    ).length,
    gwpByLob: filtered.reduce((acc, p) => {
      acc[p.lineOfBusiness] = (acc[p.lineOfBusiness] ?? 0) + p.premiumAmount;
      return acc;
    }, {})
  };

  res.json(summary);
});

// GET /policies/:id
app.get('/policies/:id', (req, res) => {
  const policy = policies.find(p => p.id === req.params['id']);
  if (!policy) return res.status(404).json({ error: 'Not found' });
  res.json(policy);
});

// PATCH /policies/:id — in-memory only
app.patch('/policies/:id', (req, res) => {
  const idx = policies.findIndex(p => p.id === req.params['id']);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  policies[idx] = { ...policies[idx], ...req.body };
  res.json(policies[idx]);
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Mock API running at http://localhost:${PORT}`);
  console.log(`   ${policies.length} policy records loaded into memory`);
});
