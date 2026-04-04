import { promises as fs } from 'node:fs';
import path from 'node:path';

const food101ClassesPath = path.resolve('datasets', 'external', 'food-101', 'meta', 'classes.txt');
const fruits360TrainingPath = path.resolve('datasets', 'external', 'fruits-360-original-size', 'Training');
const outputPath = path.resolve('src', 'app', 'data', 'foodLabelCatalog.generated.json');

function normalizeLabel(value) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildTerms(label) {
  const normalizedLabel = normalizeLabel(label);
  const terms = new Set([normalizedLabel]);

  normalizedLabel.split(' ').forEach((part) => {
    if (part.length > 2) {
      terms.add(part);
    }
  });

  return Array.from(terms);
}

async function loadFood101Labels() {
  const content = await fs.readFile(food101ClassesPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({
      label: normalizeLabel(label),
      displayLabel: titleCase(normalizeLabel(label)),
      group: 'dish',
      source: 'food-101',
      terms: buildTerms(label),
    }));
}

async function loadFruits360Labels() {
  const entries = await fs.readdir(fruits360TrainingPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => normalizeLabel(entry.name))
    .filter(Boolean)
    .map((label) => ({
      label,
      displayLabel: titleCase(label),
      group: 'produce',
      source: 'fruits-360',
      terms: buildTerms(label),
    }));
}

async function buildCatalog() {
  const [food101Labels, fruits360Labels] = await Promise.all([
    loadFood101Labels(),
    loadFruits360Labels(),
  ]);

  const byLabel = new Map();

  for (const item of [...food101Labels, ...fruits360Labels]) {
    const existingValue = byLabel.get(item.label);

    if (!existingValue) {
      byLabel.set(item.label, {
        ...item,
        sources: [item.source],
      });
      continue;
    }

    existingValue.sources = Array.from(new Set([...existingValue.sources, item.source]));
    existingValue.terms = Array.from(new Set([...existingValue.terms, ...item.terms]));
    if (existingValue.group !== item.group) {
      existingValue.group = 'mixed';
    }
  }

  const labels = Array.from(byLabel.values()).sort((left, right) => left.label.localeCompare(right.label));
  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    counts: {
      total: labels.length,
      dishes: labels.filter((item) => item.group === 'dish').length,
      produce: labels.filter((item) => item.group === 'produce').length,
      mixed: labels.filter((item) => item.group === 'mixed').length,
    },
    labels,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));

  console.log(`Food label catalog written to ${outputPath}`);
  console.log(JSON.stringify(catalog.counts, null, 2));
}

buildCatalog().catch((error) => {
  console.error('Failed to build food label catalog.');
  console.error(error);
  process.exitCode = 1;
});
