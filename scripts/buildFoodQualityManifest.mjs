import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('public', 'ml', 'dataset', 'dataset');
const outputPath = path.resolve('public', 'ml', 'food-quality-manifest.json');
const splitNames = ['train', 'test'];
const imagePattern = /\.(png|jpe?g|webp)$/i;

function normalizeFoodType(label) {
  if (label.startsWith('fresh')) {
    return label.slice('fresh'.length).replace(/s$/i, '');
  }

  if (label.startsWith('rotten')) {
    return label.slice('rotten'.length).replace(/s$/i, '');
  }

  return label.replace(/s$/i, '');
}

function normalizeFreshness(label) {
  if (label.startsWith('fresh')) return 'fresh';
  if (label.startsWith('rotten')) return 'rotten';
  return 'unknown';
}

function samplePaths(filePaths, maxItems) {
  if (filePaths.length <= maxItems) {
    return [...filePaths];
  }

  const sampledPaths = [];
  const step = filePaths.length / maxItems;

  for (let index = 0; index < maxItems; index += 1) {
    const nextIndex = Math.min(filePaths.length - 1, Math.floor(index * step));
    sampledPaths.push(filePaths[nextIndex]);
  }

  return sampledPaths;
}

async function getDirectories(targetPath) {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function getFiles(targetPath) {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && imagePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function buildManifest() {
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    datasetRoot: '/ml/dataset/dataset',
    labels: [],
    totals: {
      train: 0,
      test: 0,
      referenceTrain: 0,
      referenceTest: 0,
    },
  };

  const splitLabels = new Map();

  for (const splitName of splitNames) {
    const splitPath = path.join(rootDir, splitName);
    const labelNames = await getDirectories(splitPath);

    for (const labelName of labelNames) {
      const labelPath = path.join(splitPath, labelName);
      const fileNames = await getFiles(labelPath);
      const filePaths = fileNames.map((fileName) => `/ml/dataset/dataset/${splitName}/${labelName}/${encodeURIComponent(fileName).replace(/%2F/g, '/')}`);
      const existingLabel = splitLabels.get(labelName) ?? {
        label: labelName,
        foodType: normalizeFoodType(labelName),
        freshness: normalizeFreshness(labelName),
        train: [],
        test: [],
        counts: {
          train: 0,
          test: 0,
        },
      };

      existingLabel[splitName] = filePaths;
      existingLabel.counts[splitName] = filePaths.length;
      splitLabels.set(labelName, existingLabel);
      manifest.totals[splitName] += filePaths.length;
    }
  }

  manifest.labels = Array.from(splitLabels.values()).map((entry) => {
    const referenceTrain = samplePaths(entry.train, 48);
    const referenceTest = samplePaths(entry.test, 18);

    manifest.totals.referenceTrain += referenceTrain.length;
    manifest.totals.referenceTest += referenceTest.length;

    return {
      ...entry,
      referenceTrain,
      referenceTest,
    };
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

  console.log(`Manifest written to ${outputPath}`);
  console.log(JSON.stringify(manifest.totals, null, 2));
}

buildManifest().catch((error) => {
  console.error('Failed to build food quality manifest.');
  console.error(error);
  process.exitCode = 1;
});
