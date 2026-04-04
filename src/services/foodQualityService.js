import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import foodLabelCatalog from '../app/data/foodLabelCatalog.generated.json';
import {
  getFirestoreImageData,
  uploadFirestoreImage,
} from './firestoreImageService';

const SCANS_COL = 'qualityScans';
const MANIFEST_PATH = '/ml/food-quality-manifest.json';
const CACHE_KEY = 'lastbite-food-quality-reference-model-v1';
const IMAGE_SIZE = 224;
const EPSILON = 1e-6;
const SUPPORTED_DATASET_FOODS = new Set(['apple', 'banana', 'orange']);
const DATASET_CONFIDENCE_THRESHOLD = 0.35;
const GENERIC_FOOD_CONFIDENCE_THRESHOLD = 0.18;
const FOOD_LABEL_RULES = [
  { label: 'burger', matches: ['burger', 'cheeseburger', 'hamburger'], group: 'prepared' },
  { label: 'pizza', matches: ['pizza'], group: 'prepared' },
  { label: 'sandwich', matches: ['sandwich'], group: 'prepared' },
  { label: 'burrito', matches: ['burrito'], group: 'prepared' },
  { label: 'hot dog', matches: ['hotdog', 'hot dog'], group: 'prepared' },
  { label: 'fries', matches: ['french fries', 'fries'], group: 'snack' },
  { label: 'snack', matches: ['pretzel', 'bagel', 'dough', 'meat loaf', 'potpie', 'trifle'], group: 'snack' },
  { label: 'dessert', matches: ['ice cream', 'ice_cream', 'cake', 'chocolate sauce'], group: 'dessert' },
  { label: 'pasta', matches: ['carbonara', 'spaghetti'], group: 'prepared' },
  { label: 'salad', matches: ['salad', 'guacamole'], group: 'prepared' },
  { label: 'soup', matches: ['soup', 'espresso'], group: 'prepared' },
  { label: 'rice dish', matches: ['plate', 'bowl', 'dish'], group: 'prepared' },
  { label: 'bread', matches: ['french loaf', 'loaf', 'bread'], group: 'baked' },
  { label: 'apple', matches: ['apple'], group: 'produce' },
  { label: 'banana', matches: ['banana'], group: 'produce' },
  { label: 'orange', matches: ['orange', 'lemon'], group: 'produce' },
  { label: 'kiwi', matches: ['kiwi'], group: 'produce' },
  { label: 'broccoli', matches: ['broccoli'], group: 'produce' },
  { label: 'cauliflower', matches: ['cauliflower'], group: 'produce' },
  { label: 'mushroom', matches: ['mushroom'], group: 'produce' },
  { label: 'cucumber', matches: ['cucumber'], group: 'produce' },
  { label: 'bell pepper', matches: ['bell pepper', 'bell_pepper'], group: 'produce' },
  { label: 'pineapple', matches: ['pineapple'], group: 'produce' },
  { label: 'pomegranate', matches: ['pomegranate'], group: 'produce' },
  { label: 'fruit', matches: ['fruit'], group: 'produce' },
  { label: 'vegetable', matches: ['vegetable'], group: 'produce' },
];

let _model = null;
let _loading = false;
const _queue = [];
let _progress = {
  phase: 'idle',
  progress: 0,
  ready: false,
  message: 'AI model is idle.',
  error: null,
};
const _progressListeners = new Set();

function updateProgress(nextValue) {
  _progress = {
    ..._progress,
    ...nextValue,
  };

  _progressListeners.forEach((listener) => listener(_progress));
}

export function subscribeToModelProgress(listener) {
  _progressListeners.add(listener);
  listener(_progress);

  return () => {
    _progressListeners.delete(listener);
  };
}

function clamp(value, minValue = 0, maxValue = 100) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - maxScore));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm) + EPSILON);
}

function averageVectors(vectors) {
  if (!vectors.length) return [];

  const centroid = new Array(vectors[0].length).fill(0);

  for (const vector of vectors) {
    for (let index = 0; index < vector.length; index += 1) {
      centroid[index] += vector[index];
    }
  }

  for (let index = 0; index < centroid.length; index += 1) {
    centroid[index] /= vectors.length;
  }

  return centroid;
}

function vectorDistance(left, right) {
  let total = 0;

  for (let index = 0; index < left.length; index += 1) {
    const diff = left[index] - right[index];
    total += diff * diff;
  }

  return Math.sqrt(total);
}

function formatLabel(label) {
  return label
    .replace(/^fresh/i, 'Fresh ')
    .replace(/^rotten/i, 'Rotten ')
    .replace(/_/g, ' ')
    .trim();
}

function normalizeClassifierLabel(label) {
  return label.toLowerCase().replace(/_/g, ' ').trim();
}

function getFoodMatch(label) {
  const normalizedLabel = normalizeClassifierLabel(label);

  for (const rule of FOOD_LABEL_RULES) {
    if (rule.matches.some((match) => normalizedLabel.includes(match))) {
      return {
        label: rule.label,
        group: rule.group,
      };
    }
  }

  for (const item of foodLabelCatalog.labels) {
    if (
      normalizedLabel === item.label ||
      item.terms.some((term) => term.length > 3 && normalizedLabel.includes(term))
    ) {
      return {
        label: item.label,
        group: item.group,
      };
    }
  }

  return null;
}

function getFoodPredictions(allPreds) {
  const foodPredictions = [];

  for (const pred of allPreds) {
    const match = getFoodMatch(pred.className);

    if (match) {
      foodPredictions.push({
        ...match,
        confidence: Math.round(pred.probability * 100),
        probability: pred.probability,
      });
    }
  }

  const bestByLabel = new Map();

  for (const foodPrediction of foodPredictions) {
    const currentValue = bestByLabel.get(foodPrediction.label);
    if (!currentValue || foodPrediction.probability > currentValue.probability) {
      bestByLabel.set(foodPrediction.label, foodPrediction);
    }
  }

  return Array.from(bestByLabel.values())
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 5);
}

function getBoundingBox(imageElement) {
  const width = imageElement.naturalWidth || imageElement.width || IMAGE_SIZE;
  const height = imageElement.naturalHeight || imageElement.height || IMAGE_SIZE;
  return [0, 0, width, height];
}

function serializeReferenceModel(referenceModel) {
  return {
    manifestVersion: referenceModel.manifestVersion,
    labels: referenceModel.labels,
    foodTypes: referenceModel.foodTypes,
    labelCentroids: Object.fromEntries(
      Object.entries(referenceModel.labelCentroids).map(([label, value]) => [label, Array.from(value)])
    ),
    freshnessCentroids: Object.fromEntries(
      Object.entries(referenceModel.freshnessCentroids).map(([label, value]) => [label, Array.from(value)])
    ),
    foodTypeCentroids: Object.fromEntries(
      Object.entries(referenceModel.foodTypeCentroids).map(([label, value]) => [label, Array.from(value)])
    ),
  };
}

function deserializeReferenceModel(rawValue) {
  if (!rawValue) return null;

  try {
    const parsedValue = JSON.parse(rawValue);
    return {
      ...parsedValue,
      labelCentroids: Object.fromEntries(
        Object.entries(parsedValue.labelCentroids || {}).map(([label, value]) => [label, Float32Array.from(value)])
      ),
      freshnessCentroids: Object.fromEntries(
        Object.entries(parsedValue.freshnessCentroids || {}).map(([label, value]) => [label, Float32Array.from(value)])
      ),
      foodTypeCentroids: Object.fromEntries(
        Object.entries(parsedValue.foodTypeCentroids || {}).map(([label, value]) => [label, Float32Array.from(value)])
      ),
    };
  } catch (error) {
    console.warn('[FoodQuality] Failed to restore cached reference model:', error);
    return null;
  }
}

function readCachedReferenceModel(manifest) {
  try {
    const cachedValue = localStorage.getItem(CACHE_KEY);
    const referenceModel = deserializeReferenceModel(cachedValue);

    if (!referenceModel) return null;
    if (referenceModel.manifestVersion !== manifest.generatedAt) return null;

    return referenceModel;
  } catch (error) {
    console.warn('[FoodQuality] Cache read skipped:', error);
    return null;
  }
}

function writeCachedReferenceModel(referenceModel) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(serializeReferenceModel(referenceModel)));
  } catch (error) {
    console.warn('[FoodQuality] Cache write skipped:', error);
  }
}

async function loadManifest() {
  const response = await fetch(MANIFEST_PATH);

  if (!response.ok) {
    throw new Error('Food dataset manifest could not be loaded.');
  }

  return response.json();
}

function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    image.src = imageUrl;
  });
}

async function getEmbedding(classifier, tf, imageElement) {
  const embedding = tf.tidy(() => {
    const featureTensor = classifier.infer(imageElement, true);
    return featureTensor.dataSync();
  });

  return Float32Array.from(embedding);
}

function analyzePixels(imageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imageElement, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

  const imgData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const px = imgData.data;
  const total = IMAGE_SIZE * IMAGE_SIZE;

  let darkRot = 0;
  let greenMold = 0;
  let whiteMold = 0;
  let oxidation = 0;
  let bacterialSlime = 0;
  let localVarSum = 0;

  for (let index = 0; index < px.length; index += 4) {
    const r = px[index];
    const g = px[index + 1];
    const b = px[index + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;
    const value = max / 255;
    let hue = 0;

    if (delta !== 0) {
      if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;

      hue /= 6;
    }

    if (value < 0.18 && saturation < 0.3) darkRot += 1;
    if (hue > 0.30 && hue < 0.58 && saturation > 0.15 && value > 0.2) greenMold += 1;
    if (value > 0.82 && saturation < 0.08) whiteMold += 1;
    if (hue < 0.14 && value < 0.45 && saturation > 0.2) oxidation += 1;
    if (hue > 0.12 && hue < 0.19 && value > 0.65 && saturation > 0.35) bacterialSlime += 1;

    if (index < px.length - 8) {
      const nextR = px[index + 4];
      const nextG = px[index + 5];
      const nextB = px[index + 6];
      const diff = Math.abs((r + g + b) / 3 - (nextR + nextG + nextB) / 3);

      if (diff > 40) localVarSum += 1;
    }
  }

  return {
    darkSpotRatio: darkRot / total,
    greenMoldRatio: greenMold / total,
    whitePatchRatio: whiteMold / total,
    moldIndicator: (greenMold + whiteMold * 0.08) / total,
    oxidationRatio: oxidation / total,
    bacteriaIndicator: bacterialSlime / total,
    textureIrregularity: localVarSum / total,
  };
}

async function trainReferenceModel(classifier, tf, manifest) {
  const labelEmbeddings = {};
  const freshnessEmbeddings = {};
  const foodTypeEmbeddings = {};
  const totalImages = manifest.labels.reduce((sum, labelEntry) => sum + labelEntry.referenceTrain.length, 0) || 1;
  let processedImages = 0;

  for (const labelEntry of manifest.labels) {
    labelEmbeddings[labelEntry.label] = [];
    freshnessEmbeddings[labelEntry.freshness] ??= [];
    foodTypeEmbeddings[labelEntry.foodType] ??= [];

    updateProgress({
      phase: 'training_reference_model',
      progress: Math.round((processedImages / totalImages) * 50) + 45,
      ready: false,
      error: null,
      message: `Training dataset references for ${labelEntry.foodType} (${labelEntry.freshness})`,
    });

    for (const imageUrl of labelEntry.referenceTrain) {
      const imageElement = await loadImage(imageUrl);
      const embedding = await getEmbedding(classifier, tf, imageElement);

      labelEmbeddings[labelEntry.label].push(embedding);
      freshnessEmbeddings[labelEntry.freshness].push(embedding);
      foodTypeEmbeddings[labelEntry.foodType].push(embedding);
      processedImages += 1;

      updateProgress({
        phase: 'training_reference_model',
        progress: Math.round((processedImages / totalImages) * 50) + 45,
        ready: false,
        error: null,
        message: `Preparing AI dataset model ${processedImages}/${totalImages}`,
      });
    }
  }

  return {
    manifestVersion: manifest.generatedAt,
    labels: manifest.labels.map((entry) => entry.label),
    foodTypes: Array.from(new Set(manifest.labels.map((entry) => entry.foodType))),
    labelCentroids: Object.fromEntries(
      Object.entries(labelEmbeddings).map(([label, vectors]) => [label, Float32Array.from(averageVectors(vectors))])
    ),
    freshnessCentroids: Object.fromEntries(
      Object.entries(freshnessEmbeddings).map(([label, vectors]) => [label, Float32Array.from(averageVectors(vectors))])
    ),
    foodTypeCentroids: Object.fromEntries(
      Object.entries(foodTypeEmbeddings).map(([label, vectors]) => [label, Float32Array.from(averageVectors(vectors))])
    ),
  };
}

async function loadModel() {
  if (_model) return _model;
  if (_loading) {
    return new Promise((resolve, reject) => _queue.push({ resolve, reject }));
  }

  _loading = true;
  updateProgress({
    phase: 'starting',
    progress: 5,
    ready: false,
    error: null,
    message: 'Starting AI food model...',
  });

  try {
    updateProgress({
      phase: 'loading_tfjs',
      progress: 12,
      ready: false,
      error: null,
      message: 'Loading TensorFlow runtime...',
    });
    const tf = await import('@tensorflow/tfjs');

    try {
      await tf.setBackend('webgl');
    } catch (error) {
      await tf.setBackend('cpu');
    }

    await tf.ready();
    updateProgress({
      phase: 'loading_mobilenet',
      progress: 24,
      ready: false,
      error: null,
      message: 'Loading MobileNet vision backbone...',
    });

    const mobilenet = await import('@tensorflow-models/mobilenet');
    const classifier = await mobilenet.load({ version: 2, alpha: 1.0 });
    updateProgress({
      phase: 'loading_manifest',
      progress: 36,
      ready: false,
      error: null,
      message: 'Loading food dataset manifest...',
    });
    const manifest = await loadManifest();
    updateProgress({
      phase: 'checking_cache',
      progress: 44,
      ready: false,
      error: null,
      message: 'Checking cached food reference model...',
    });
    const cachedReferenceModel = readCachedReferenceModel(manifest);
    const referenceModel = cachedReferenceModel ?? await trainReferenceModel(classifier, tf, manifest);

    if (!cachedReferenceModel) {
      writeCachedReferenceModel(referenceModel);
    } else {
      updateProgress({
        phase: 'using_cache',
        progress: 88,
        ready: false,
        error: null,
        message: 'Using cached food reference model...',
      });
    }

    _model = { classifier, manifest, referenceModel, tf };
    updateProgress({
      phase: 'ready',
      progress: 100,
      ready: true,
      error: null,
      message: 'AI food model is ready.',
    });
    _queue.forEach(({ resolve }) => resolve(_model));
    _queue.length = 0;
    return _model;
  } catch (error) {
    _loading = false;
    _queue.forEach(({ reject }) => reject(error));
    _queue.length = 0;
    updateProgress({
      phase: 'error',
      progress: 0,
      ready: false,
      error: error.message,
      message: 'AI model failed to load.',
    });
    console.error('[FoodQuality] Model initialization failed:', error);
    throw new Error(`AI Model Error: ${error.message}`);
  } finally {
    _loading = false;
  }
}

export function preloadModel() {
  loadModel().catch((error) => {
    console.warn('[FoodQuality] Preload deferred:', error.message);
  });
}

export function generateSpoilageHeatmap(imageElement, width = 400, height = 300) {
  const grid = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imageElement, 0, 0, width, height);

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = width;
  analysisCanvas.height = height;
  const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
  analysisCtx.drawImage(imageElement, 0, 0, width, height);

  const cellW = Math.floor(width / grid);
  const cellH = Math.floor(height / grid);

  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      const x = gx * cellW;
      const y = gy * cellH;
      const data = analysisCtx.getImageData(x, y, cellW, cellH).data;
      const count = cellW * cellH || 1;
      let dark = 0;
      let mold = 0;
      let brown = 0;

      for (let index = 0; index < data.length; index += 4) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const brightness = (r + g + b) / 3;

        if (brightness < 50) dark += 1;
        if (g > r * 1.3 && g > b * 1.3 && g > 80) mold += 1;
        if (r > 80 && g > 50 && g < r * 0.8 && b < r * 0.5) brown += 1;
      }

      const severity = Math.min(1, (dark / count) * 2.5 + (mold / count) * 3.5 + (brown / count) * 1.8);

      if (severity > 0.05) {
        const hue = (1 - severity) * 120;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${severity * 0.55})`;
        ctx.fillRect(x, y, cellW, cellH);

        if (severity > 0.35) {
          ctx.strokeStyle = `hsla(0, 100%, 50%, ${severity * 0.8})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
      }
    }
  }

  return canvas.toDataURL('image/png');
}

function computeVerdict(referenceModel, embedding, pxAnalysis, metadata = {}) {
  const { temperature = 25, daysOld = 0, storageType = 'room' } = metadata;
  const allPreds = metadata.allPreds || [];
  const foodPreds = getFoodPredictions(allPreds);
  const labelScores = Object.entries(referenceModel.labelCentroids).map(([label, centroid]) => ({
    label,
    score: cosineSimilarity(embedding, centroid),
  }));
  const labelProbabilities = softmax(labelScores.map((entry) => entry.score * 8));
  const rankedLabels = labelScores
    .map((entry, index) => ({
      ...entry,
      probability: labelProbabilities[index],
    }))
    .sort((left, right) => right.probability - left.probability);

  const freshnessScores = Object.entries(referenceModel.freshnessCentroids).map(([label, centroid]) => ({
    label,
    score: cosineSimilarity(embedding, centroid),
  }));
  const freshnessProbabilities = softmax(freshnessScores.map((entry) => entry.score * 10));
  const freshnessMap = Object.fromEntries(
    freshnessScores.map((entry, index) => [entry.label, freshnessProbabilities[index]])
  );

  const foodTypeScores = Object.entries(referenceModel.foodTypeCentroids).map(([label, centroid]) => ({
    label,
    score: cosineSimilarity(embedding, centroid),
  }));
  const foodTypeProbabilities = softmax(foodTypeScores.map((entry) => entry.score * 8));
  const rankedFoodTypes = foodTypeScores
    .map((entry, index) => ({
      ...entry,
      probability: foodTypeProbabilities[index],
    }))
    .sort((left, right) => right.probability - left.probability);

  const topLabel = rankedLabels[0];
  const topFoodType = rankedFoodTypes[0];
  const topFoodPred = foodPreds[0];
  const datasetFoodType = topFoodPred?.label || topFoodType?.label || 'unknown';
  const datasetFoodSupported =
    SUPPORTED_DATASET_FOODS.has(datasetFoodType) &&
    (topFoodPred?.probability ?? 0) >= DATASET_CONFIDENCE_THRESHOLD;
  const genericFoodDetected = (topFoodPred?.probability ?? 0) >= GENERIC_FOOD_CONFIDENCE_THRESHOLD;
  const freshProbability = freshnessMap.fresh ?? 0;
  const rottenProbability = freshnessMap.rotten ?? 0;
  const topLabelProbability = topLabel?.probability ?? 0;
  const topFoodProbability = topFoodType?.probability ?? 0;
  const effectiveMoldIndicator =
    pxAnalysis.greenMoldRatio +
    (
      pxAnalysis.whitePatchRatio *
      (
        pxAnalysis.darkSpotRatio > 0.05 ||
        pxAnalysis.textureIrregularity > 0.12 ||
        pxAnalysis.bacteriaIndicator > 0.04
          ? 0.2
          : 0.03
      )
    );
  const criticalSpoilageEvidence =
    pxAnalysis.greenMoldRatio > 0.12 ||
    (pxAnalysis.darkSpotRatio > 0.2 && pxAnalysis.textureIrregularity > 0.16) ||
    (pxAnalysis.bacteriaIndicator > 0.1 && pxAnalysis.textureIrregularity > 0.14);
  const freshnessDistance = vectorDistance(
    embedding,
    referenceModel.freshnessCentroids.fresh || referenceModel.labelCentroids[topLabel.label]
  );
  const rottenDistance = vectorDistance(
    embedding,
    referenceModel.freshnessCentroids.rotten || referenceModel.labelCentroids[topLabel.label]
  );

  let score = freshProbability * 100;
  score -= pxAnalysis.darkSpotRatio * 160;
  score -= effectiveMoldIndicator * 220;
  score -= pxAnalysis.oxidationRatio * 120;
  score -= pxAnalysis.bacteriaIndicator * 180;
  score -= pxAnalysis.textureIrregularity * 90;

  const tempExcess = Math.max(0, temperature - 22);
  const tempMultiplier = Math.pow(1.07, tempExcess);
  const baseTimeLoss = daysOld * (storageType === 'room' ? 7 : storageType === 'fridge' ? 1.6 : 0.35);
  score -= baseTimeLoss * tempMultiplier;

  const confidenceGap = Math.abs(freshProbability - rottenProbability);
  const labelGap = (rankedLabels[0]?.probability ?? 0) - (rankedLabels[1]?.probability ?? 0);
  const unsupportedFood =
    !genericFoodDetected &&
    (topFoodProbability < 0.55 || topLabelProbability < 0.45 || labelGap < 0.12);

  if (!datasetFoodSupported && genericFoodDetected && topFoodPred) {
    let genericScore = 88;
    genericScore -= pxAnalysis.darkSpotRatio * 75;
    genericScore -= pxAnalysis.greenMoldRatio * 280;
    genericScore -= effectiveMoldIndicator * 45;
    genericScore -= pxAnalysis.oxidationRatio * 55;
    genericScore -= pxAnalysis.bacteriaIndicator * 35;
    genericScore -= pxAnalysis.textureIrregularity * 60;

    const tempExcess = Math.max(0, temperature - 22);
    const tempMultiplier = Math.pow(1.08, tempExcess);
    const baseTimeLoss = daysOld * (storageType === 'room' ? 9 : storageType === 'fridge' ? 2.2 : 0.5);
    genericScore -= baseTimeLoss * tempMultiplier;
    genericScore = clamp(Math.round(genericScore));

    let status = 'fresh';
    let statusLabel = 'Fresh / Safe Looking';
    let statusColor = '#10b981';

    if (
      criticalSpoilageEvidence &&
      (
        genericScore < 28 ||
        pxAnalysis.greenMoldRatio > 0.08 ||
        (effectiveMoldIndicator > 0.08 && pxAnalysis.darkSpotRatio > 0.1) ||
        (pxAnalysis.darkSpotRatio > 0.18 && pxAnalysis.textureIrregularity > 0.14)
      )
    ) {
      status = 'rotten';
      statusLabel = 'Spoilage Suspected';
      statusColor = '#ef4444';
    } else if (
      genericScore < 65 ||
      pxAnalysis.greenMoldRatio > 0.03 ||
      (effectiveMoldIndicator > 0.05 && pxAnalysis.textureIrregularity > 0.14) ||
      pxAnalysis.textureIrregularity > 0.16
    ) {
      status = 'semi-rotten';
      statusLabel = 'Needs Manual Review';
      statusColor = '#f59e0b';
    }

    return {
      freshnessScore: genericScore,
      spoilagePercent: 100 - genericScore,
      status,
      statusLabel,
      statusColor,
      isFoodDetected: true,
      topClassification: topFoodPred.label,
      classificationConfidence: topFoodPred.confidence,
      spoilageIndicators: {
        darkSpots: clamp(Math.round(pxAnalysis.darkSpotRatio * 100 * 6)),
        moldRisk: clamp(Math.round(effectiveMoldIndicator * 100 * 12)),
        mushiness: clamp(Math.round(pxAnalysis.textureIrregularity * 100 * 4)),
        bacteria: clamp(Math.round(pxAnalysis.bacteriaIndicator * 100 * 10)),
      },
      metadata: {
        temperature,
        daysOld,
        storageType,
        supportedFoodType: true,
        datasetMatched: false,
        classificationMode: 'generic-food',
        foodGroup: topFoodPred.group,
      },
      predictions: foodPreds.map((entry) => ({
        label: entry.label,
        confidence: entry.confidence,
      })),
      detectedObjects: [{
        class: topFoodPred.label,
        score: topFoodPred.probability,
        bbox: metadata.boundingBox || [0, 0, IMAGE_SIZE, IMAGE_SIZE],
      }],
    };
  }

  if (unsupportedFood) {
    return {
      freshnessScore: 50,
      spoilagePercent: 50,
      status: 'semi-rotten',
      statusLabel: 'Unsupported Food Type',
      statusColor: '#f59e0b',
      isFoodDetected: false,
      topClassification: 'unknown',
      classificationConfidence: Math.round(topFoodProbability * 100),
      spoilageIndicators: {
        darkSpots: clamp(Math.round(pxAnalysis.darkSpotRatio * 100 * 6)),
        moldRisk: clamp(Math.round(effectiveMoldIndicator * 100 * 12)),
        mushiness: clamp(Math.round(pxAnalysis.textureIrregularity * 100 * 4)),
        bacteria: clamp(Math.round(pxAnalysis.bacteriaIndicator * 100 * 10)),
      },
      metadata: {
        temperature,
        daysOld,
        storageType,
        supportedFoodType: false,
        datasetMatched: false,
        classificationMode: 'unsupported',
      },
      predictions: (foodPreds.length ? foodPreds : rankedLabels.slice(0, 5)).map((entry) => ({
        label: entry.label ? formatLabel(entry.label) : 'Unknown',
        confidence: entry.confidence ?? Math.round(entry.probability * 100),
      })),
      detectedObjects: [],
    };
  }

  if (confidenceGap < 0.18) {
    score -= 8;
  }

  score = clamp(Math.round(score));

  let status = 'fresh';
  let statusLabel = 'Verified Fresh';
  let statusColor = '#10b981';

  if (
    criticalSpoilageEvidence &&
    (score < 38 || rottenProbability > 0.74 || rottenDistance < freshnessDistance * 0.9)
  ) {
    status = 'rotten';
    statusLabel = 'Rotten - Do Not Serve';
    statusColor = '#ef4444';
  } else if (score < 72 || confidenceGap < 0.2 || rottenProbability > 0.55) {
    status = 'semi-rotten';
    statusLabel = 'Needs Review';
    statusColor = '#f59e0b';
  }

  return {
    freshnessScore: score,
    spoilagePercent: 100 - score,
    status,
    statusLabel,
    statusColor,
    isFoodDetected: Boolean(topFoodPred || topFoodType),
    spoilageIndicators: {
      darkSpots: clamp(Math.round(pxAnalysis.darkSpotRatio * 100 * 6)),
      moldRisk: clamp(Math.round(effectiveMoldIndicator * 100 * 12)),
      mushiness: clamp(Math.round(pxAnalysis.textureIrregularity * 100 * 4)),
      bacteria: clamp(Math.round(pxAnalysis.bacteriaIndicator * 100 * 10)),
    },
    metadata: {
      temperature,
      daysOld,
      storageType,
      supportedFoodType: true,
      datasetMatched: true,
      classificationMode: 'dataset-fruit',
    },
    predictions: (foodPreds.length ? foodPreds : rankedLabels.slice(0, 5)).map((entry) => ({
      label: entry.label ? formatLabel(entry.label) : 'Unknown',
      confidence: entry.confidence ?? Math.round(entry.probability * 100),
    })),
    detectedObjects: (topFoodPred || topFoodType) ? [{
      class: topFoodPred?.label || topFoodType.label,
      score: topFoodPred?.probability || topFoodType.probability,
      bbox: metadata.boundingBox || [0, 0, IMAGE_SIZE, IMAGE_SIZE],
    }] : [],
    topClassification: topFoodPred?.label || topFoodType?.label || topLabel?.label || 'unknown',
    classificationConfidence: topFoodPred?.confidence || Math.round((topFoodType?.probability || topLabel?.probability || 0) * 100),
  };
}

export async function analyzeFoodImage(imageElement, metadata = {}) {
  const model = await loadModel();
  const embedding = await getEmbedding(model.classifier, model.tf, imageElement);
  const allPreds = await model.classifier.classify(imageElement, 12);
  const pxAnalysis = analyzePixels(imageElement);

  return computeVerdict(model.referenceModel, embedding, pxAnalysis, {
    ...metadata,
    allPreds,
    boundingBox: getBoundingBox(imageElement),
  });
}

export function analyzeFoodImageFromFile(file, metadata = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          resolve(await analyzeFoodImage(img, metadata));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeVideoFrame(videoElement, metadata = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.src = canvas.toDataURL('image/jpeg', 0.85);
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
  });

  return analyzeFoodImage(img, metadata);
}

async function uploadToFirestoreImages(file) {
  try {
    const { imageId } = await uploadFirestoreImage(file, {
      maxSize: 600,
      quality: 0.6,
      metadata: {
        type: file.type,
        name: file.name,
        kind: 'quality-scan',
      },
    });
    return imageId;
  } catch (error) {
    console.error('[ImageSave] Failed to save to Firestore images:', error);
    throw new Error('Image save failed. Check your database connection.');
  }
}

async function mapScanEntry(entry) {
  const data = entry.data();
  const image = data.imageId ? await getFirestoreImageData(data.imageId) : null;

  return {
    id: entry.id,
    ...data,
    image: image || data.imageUrl || null,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function saveQualityScan({
  donationId = null,
  uploadedBy,
  uploaderId,
  uploaderName,
  imageFile,
  analysisResult,
  heatmapDataUrl = null,
}) {
  const imageId = await uploadToFirestoreImages(imageFile);

  const scanDoc = await addDoc(collection(db, SCANS_COL), {
    donationId,
    uploadedBy,
    uploaderId,
    uploaderName,
    imageId,
    imageUrl: null,
    heatmapUrl: heatmapDataUrl || null,
    freshnessScore: analysisResult.freshnessScore,
    spoilagePercent: analysisResult.spoilagePercent,
    status: analysisResult.status,
    statusLabel: analysisResult.statusLabel,
    isFoodDetected: analysisResult.isFoodDetected,
    topClassification: analysisResult.topClassification,
    classificationConfidence: analysisResult.classificationConfidence,
    spoilageIndicators: analysisResult.spoilageIndicators,
    metadata: analysisResult.metadata || {},
    predictions: analysisResult.predictions,
    createdAt: serverTimestamp(),
  });

  if (donationId) {
    const field = uploadedBy === 'restaurant' ? 'restaurantScanId' : 'ngoScanId';
    const statusField = uploadedBy === 'restaurant' ? 'restaurantQualityStatus' : 'ngoQualityStatus';

    await updateDoc(doc(db, 'donations', donationId), {
      [field]: scanDoc.id,
      [statusField]: analysisResult.status,
      updatedAt: serverTimestamp(),
    });
  }

  return { scanId: scanDoc.id, imageId };
}

export async function getScanHistory(userId, maxItems = 20) {
  const snap = await getDocs(
    query(
      collection(db, SCANS_COL),
      where('uploaderId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    )
  );

  return Promise.all(snap.docs.map(mapScanEntry));
}

export function listenToScanHistory(userId, cb) {
  return onSnapshot(
    query(
      collection(db, SCANS_COL),
      where('uploaderId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    ),
    async (snap) => {
      cb(await Promise.all(snap.docs.map(mapScanEntry)));
    }
  );
}

export async function getDonationScans(donationId) {
  const snap = await getDocs(
    query(
      collection(db, SCANS_COL),
      where('donationId', '==', donationId),
      orderBy('createdAt', 'desc')
    )
  );

  return snap.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
    createdAt: entry.data().createdAt?.toDate?.() ?? new Date(),
  }));
}
