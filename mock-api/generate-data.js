import { faker } from '@faker-js/faker';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LINES_OF_BUSINESS = ['Property', 'Casualty', 'A&H', 'Marine'];
const STATUSES = ['Active', 'Expired', 'Pending', 'Cancelled'];
const CURRENCIES = ['USD', 'SGD', 'HKD', 'AUD', 'JPY', 'THB'];
const REGIONS = [
  'Singapore', 'Hong Kong', 'Australia', 'Japan',
  'Thailand', 'Indonesia', 'Malaysia', 'Philippines'
];

// Realistic distribution weights
const STATUS_WEIGHTS    = [0.55, 0.20, 0.15, 0.10]; // Active, Expired, Pending, Cancelled
const REGION_WEIGHTS    = [0.20, 0.18, 0.15, 0.12, 0.12, 0.10, 0.08, 0.05];
const LOB_WEIGHTS       = [0.35, 0.30, 0.20, 0.15];
const CURRENCY_WEIGHTS  = [0.25, 0.22, 0.18, 0.15, 0.12, 0.08];

const APAC_FIRST_NAMES = [
  'Wei', 'Mei', 'Jian', 'Hui', 'Xiao', 'Aiko', 'Kenji', 'Yuki', 'Haruto', 'Sakura',
  'Rahul', 'Priya', 'Siti', 'Ahmad', 'Noor', 'Thanh', 'Linh', 'Minh', 'Anna', 'John',
  'James', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'Robert', 'Chen', 'Liu', 'Wang',
  'Zhang', 'Lee', 'Kim', 'Park', 'Lim', 'Tan', 'Chan', 'Ng', 'Yap', 'Teo',
  'Suriya', 'Malee', 'Somchai', 'Nattapong', 'Wiroj', 'Budi', 'Dewi', 'Rizky', 'Sari', 'Agus'
];

const APAC_LAST_NAMES = [
  'Wong', 'Chen', 'Tan', 'Lee', 'Lim', 'Ng', 'Kim', 'Park', 'Suzuki', 'Tanaka',
  'Yamamoto', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Sharma', 'Singh', 'Patel',
  'Rahman', 'Abdullah', 'Budi', 'Santoso', 'Wijaya', 'Suryadi', 'Tran', 'Nguyen', 'Pham',
  'Reyes', 'Santos', 'Garcia', 'Cruz', 'Ramos', 'Torres', 'Flores', 'Smith', 'Johnson',
  'Williams', 'Brown', 'Davis', 'Chong', 'Goh', 'Yeo', 'Koh', 'Ong', 'Phong', 'Thakur'
];

function weighted(items, weights) {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function apacName() {
  const first = APAC_FIRST_NAMES[Math.floor(Math.random() * APAC_FIRST_NAMES.length)];
  const last  = APAC_LAST_NAMES[Math.floor(Math.random() * APAC_LAST_NAMES.length)];
  return `${first} ${last}`;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateDates(status) {
  const today = new Date('2026-06-10');

  if (status === 'Active') {
    // Some expiring within 30 days
    const expiringSoon = Math.random() < 0.15;
    const effectiveDate = new Date(today);
    effectiveDate.setFullYear(today.getFullYear() - 1);
    effectiveDate.setDate(effectiveDate.getDate() + Math.floor(Math.random() * 335));

    const expiryDate = new Date(effectiveDate);
    if (expiringSoon) {
      expiryDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
      expiryDate.setMonth(today.getMonth());
      expiryDate.setFullYear(today.getFullYear());
    } else {
      expiryDate.setFullYear(effectiveDate.getFullYear() + 1);
    }
    return { effectiveDate: formatDate(effectiveDate), expiryDate: formatDate(expiryDate) };
  }

  if (status === 'Expired') {
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() - Math.floor(Math.random() * 365) - 1);
    const effectiveDate = new Date(expiryDate);
    effectiveDate.setFullYear(expiryDate.getFullYear() - 1);
    return { effectiveDate: formatDate(effectiveDate), expiryDate: formatDate(expiryDate) };
  }

  if (status === 'Pending') {
    const effectiveDate = new Date(today);
    effectiveDate.setDate(today.getDate() + Math.floor(Math.random() * 60) + 1);
    const expiryDate = new Date(effectiveDate);
    expiryDate.setFullYear(effectiveDate.getFullYear() + 1);
    return { effectiveDate: formatDate(effectiveDate), expiryDate: formatDate(expiryDate) };
  }

  // Cancelled — past dates
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() - Math.floor(Math.random() * 180) - 30);
  const effectiveDate = new Date(expiryDate);
  effectiveDate.setMonth(expiryDate.getMonth() - 6);
  return { effectiveDate: formatDate(effectiveDate), expiryDate: formatDate(expiryDate) };
}

const policies = Array.from({ length: 250 }, (_, i) => {
  const status = weighted(STATUSES, STATUS_WEIGHTS);
  const region = weighted(REGIONS, REGION_WEIGHTS);
  const lineOfBusiness = weighted(LINES_OF_BUSINESS, LOB_WEIGHTS);
  const currency = weighted(CURRENCIES, CURRENCY_WEIGHTS);
  const { effectiveDate, expiryDate } = generateDates(status);

  const policyNumber = `POL-${String(1000000 + i + 1).slice(1)}`;

  return {
    id: faker.string.uuid(),
    policyNumber,
    policyHolderName: apacName(),
    lineOfBusiness,
    status,
    premiumAmount: Math.round(faker.number.float({ min: 1000, max: 5000000, fractionDigits: 2 }) * 100) / 100,
    currency,
    effectiveDate,
    expiryDate,
    region,
    underwriter: apacName(),
    flaggedForReview: Math.random() < 0.08
  };
});

const outputPath = join(__dirname, 'db.json');
writeFileSync(outputPath, JSON.stringify(policies, null, 2), 'utf-8');
console.log(`✅ Generated ${policies.length} policy records → ${outputPath}`);

const statusCounts = STATUSES.reduce((acc, s) => {
  acc[s] = policies.filter(p => p.status === s).length;
  return acc;
}, {});
console.log('Distribution:', statusCounts);
