#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const BASE_LOCALE = process.env.BASE_LOCALE || 'en';
const MESSAGES_ROOT = path.resolve(__dirname, '../messages');
const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z0-9]+)?$/i;

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

function flattenObject(obj, prefix = '', acc = new Map()) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) acc.set(prefix, obj);
    return acc;
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, nextKey, acc);
    } else {
      acc.set(nextKey, value);
    }
  }

  return acc;
}

function flattenLocale(locale) {
  const localeMap = new Map();
  const rootJsonPath = path.join(MESSAGES_ROOT, `${locale}.json`);
  const localeDirPath = path.join(MESSAGES_ROOT, locale);

  if (fs.existsSync(rootJsonPath)) {
    const data = readJson(rootJsonPath);
    flattenObject(data, '', localeMap);
  }

  if (fs.existsSync(localeDirPath) && fs.statSync(localeDirPath).isDirectory()) {
    const files = glob.sync('**/*.json', { cwd: localeDirPath, nodir: true });

    files.forEach((relativePath) => {
      const absolutePath = path.join(localeDirPath, relativePath);
      const data = readJson(absolutePath);
      const prefix = relativePath
        .replace(/\.json$/, '')
        .split(path.sep)
        .join('.');
      flattenObject(data, prefix, localeMap);
    });
  }

  return localeMap;
}

function discoverLocales() {
  const entries = fs.readdirSync(MESSAGES_ROOT, { withFileTypes: true });
  const locales = new Set();

  entries.forEach((entry) => {
    if (entry.isDirectory() && LOCALE_PATTERN.test(entry.name)) {
      locales.add(entry.name);
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      const candidate = entry.name.replace(/\.json$/, '');
      if (LOCALE_PATTERN.test(candidate)) {
        locales.add(candidate);
      }
    }
  });

  return Array.from(locales).sort((a, b) =>
    a === BASE_LOCALE ? -1 : b === BASE_LOCALE ? 1 : a.localeCompare(b),
  );
}

function toPercent(numerator, denominator) {
  if (!denominator) return '0.00%';
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function main() {
  if (!fs.existsSync(MESSAGES_ROOT)) {
    process.stderr.write(`Translation directory not found: ${MESSAGES_ROOT}\n`);
    process.exit(1);
  }

  const locales = discoverLocales();
  if (!locales.includes(BASE_LOCALE)) {
    process.stderr.write(`Base locale "${BASE_LOCALE}" not found in messages directory.\n`);
    process.exit(1);
  }

  const baseMap = flattenLocale(BASE_LOCALE);
  const totalKeys = baseMap.size;

  if (!totalKeys) {
    process.stderr.write(`Base locale "${BASE_LOCALE}" has no translation keys.\n`);
    process.exit(1);
  }

  const lines = [
    `Base locale: ${BASE_LOCALE} (${totalKeys} keys)`,
    '',
    'Locale  | Available | Missing | Coverage',
    '--------|-----------|---------|---------',
  ];

  locales.forEach((locale) => {
    const localeMap = locale === BASE_LOCALE ? baseMap : flattenLocale(locale);
    const missingKeys = [];

    baseMap.forEach((_, key) => {
      if (!localeMap.has(key)) {
        missingKeys.push(key);
      }
    });

    const available = totalKeys - missingKeys.length;
    const coverage = toPercent(available, totalKeys);

    const localeLabel = locale.padEnd(6, ' ');
    const availableLabel = String(available).padStart(9, ' ');
    const missingLabel = String(missingKeys.length).padStart(7, ' ');
    const coverageLabel = coverage.padStart(8, ' ');

    lines.push(`${localeLabel} | ${availableLabel} | ${missingLabel} | ${coverageLabel}`);

    if (missingKeys.length) {
      const preview = missingKeys.slice(0, 5).join(', ');
      const suffix = missingKeys.length > 5 ? ' …' : '';
      lines.push(`  missing examples: ${preview}${suffix}`);
    }
  });

  process.stdout.write(`${lines.join('\n')}\n`);
}

main();
