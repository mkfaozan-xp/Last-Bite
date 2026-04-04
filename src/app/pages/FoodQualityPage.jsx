/**
 * FoodQualityPage — Full-featured AI Food Quality Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  • Drag-and-drop + file upload + live camera scanning
 *  • TensorFlow.js MobileNet inference (fully browser-based)
 *  • Canvas overlay spoilage heatmap
 *  • 3-class output: Fresh / Semi-Rotten / Rotten
 *  • Freshness score (0-100) and spoilage severity %
 *  • Real-time scan history from Firestore
 *  • "Anti-gravity" touchless auto-capture from camera
 *  • Firestore `images` collection for image persistence
 *  • Mobile-responsive design
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Upload, Shield, ShieldCheck, ShieldAlert, ShieldX,
  Loader2, BarChart3, Sparkles, X, CheckCircle2, AlertTriangle,
  XCircle, Microscope, Zap, Eye, History, Video, VideoOff,
  RotateCcw, Download, Clock, TrendingDown,
  Scan, Focus, Info, Thermometer, Refrigerator
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Navigation } from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useApp } from '../contexts/AppContext';
import {
  analyzeFoodImageFromFile, analyzeVideoFrame,
  generateSpoilageHeatmap, saveQualityScan, preloadModel,
  listenToScanHistory, subscribeToModelProgress,
} from '../../services/foodQualityService';
import { toast } from 'sonner';

/* ─── STATUS CONFIG ───────────────────────────────────────────────────────── */
const STATUS_CFG = {
  fresh: {
    icon: ShieldCheck, color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-800',
    gradient: 'from-green-500 to-emerald-600',
    glow: 'shadow-green-500/20',
    emoji: '✅',
  },
  'semi-rotten': {
    icon: ShieldAlert, color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-800',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20',
    emoji: '⚠️',
  },
  rotten: {
    icon: ShieldX, color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-800',
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20',
    emoji: '🚨',
  },
};

export default function FoodQualityPage() {
  const { currentUser } = useApp();

  // Scanner state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const videoRef = useRef(null);
  const autoCaptureRef = useRef(null);

  // History state
  const [scanHistory, setScanHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [modelLoadState, setModelLoadState] = useState({
    phase: 'idle',
    progress: 0,
    ready: false,
    message: 'Preparing AI food model...',
    error: null,
  });

  // Metadata Input state
  const [metadata, setMetadata] = useState({
    temperature: 25,
    daysOld: 0,
    storageType: 'room'
  });

  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  // ── Preload model on mount ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToModelProgress(setModelLoadState);
    preloadModel();
    return unsub;
  }, []);

  // ── Listen to scan history ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = listenToScanHistory(currentUser.uid, (scans) => {
      setScanHistory(scans);
      setHistoryLoaded(true);
    });
    return unsub;
  }, [currentUser?.uid]);

  // ── Cleanup camera on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    };
  }, [cameraStream]);

  /* ─── FILE HANDLING ──────────────────────────────────────────────────────── */

  const processFile = useCallback((f) => {
    if (!f || !f.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    setFile(f);
    setAnalysisResult(null);
    setHeatmapUrl(null);
    setShowHeatmap(false);
    stopCamera();

    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleFileSelect = useCallback((e) => {
    processFile(e.target.files?.[0]);
  }, [processFile]);

  /* ─── DRAG & DROP ────────────────────────────────────────────────────────── */

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    processFile(f);
  }, [processFile]);

  /* ─── CAMERA ─────────────────────────────────────────────────────────────── */

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
      setFile(null);
      setPreview(null);
      setAnalysisResult(null);
      setHeatmapUrl(null);

      // Wait for ref to be assigned
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      toast.error('Camera access denied or unavailable');
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraActive(false);
    setAutoCapture(false);
    if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
  }, [cameraStream]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const f = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        processFile(f);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [processFile, stopCamera]);

  // ── Anti-gravity: auto-capture from camera every 4 seconds ────────────────
  useEffect(() => {
    if (autoCapture && cameraActive && videoRef.current) {
      autoCaptureRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          setScanPhase('analyzing');
          setScanning(true);
          const result = await analyzeVideoFrame(videoRef.current, metadata);
          setAnalysisResult(result);
          setScanning(false);
          setScanPhase('');

          if (result.status === 'rotten') {
            toast.error('🚨 Rotten food detected! Auto-pausing scan.');
            setAutoCapture(false);
          }
        } catch (err) {
          console.error('Auto-capture error:', err);
        }
      }, 4000);
    } else {
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    }
    return () => {
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    };
  }, [autoCapture, cameraActive, metadata]);

  /* ─── AI SCAN ────────────────────────────────────────────────────────────── */

  const runScan = useCallback(async () => {
    if (!file) { toast.error('Upload a food image first'); return; }

    setScanning(true);
    setScanPhase('loading_model');

    try {
      await new Promise(r => setTimeout(r, 300));
      setScanPhase('analyzing');

      const result = await analyzeFoodImageFromFile(file, metadata);
      setScanPhase('heatmap');

      // Generate heatmap overlay
      const img = new Image();
      img.src = preview;
      await new Promise(r => { img.onload = r; });
      const heatmap = generateSpoilageHeatmap(img);
      setHeatmapUrl(heatmap);

      setScanPhase('done');
      await new Promise(r => setTimeout(r, 400));
      setAnalysisResult(result);

      const cfg = STATUS_CFG[result.status];
      toast[result.status === 'fresh' ? 'success' : result.status === 'rotten' ? 'error' : 'warning'](
        `${cfg.emoji} ${result.statusLabel} (Score: ${result.freshnessScore}%)`
      );
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setScanning(false);
      setScanPhase('');
    }
  }, [file, preview]);

  /* ─── SAVE TO FIREBASE ──────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    if (!analysisResult || !file) return;
    if (!currentUser?.uid) {
      toast.error('Please sign in before saving scan history');
      return;
    }
    setSaving(true);
    try {
      await saveQualityScan({
        uploadedBy: currentUser.userType || 'user',
        uploaderId: currentUser.uid,
        uploaderName: currentUser.name || 'User',
        imageFile: file,
        analysisResult,
        heatmapDataUrl: heatmapUrl,
      });
      toast.success('Scan saved to your history! 📋');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save — check permissions');
    } finally {
      setSaving(false);
    }
  }, [analysisResult, file, currentUser, heatmapUrl]);

  /* ─── RESET ──────────────────────────────────────────────────────────────── */

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setHeatmapUrl(null);
    setShowHeatmap(false);
    setScanPhase('');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cfg = analysisResult ? STATUS_CFG[analysisResult.status] : null;
  const StatusIcon = cfg?.icon ?? Shield;

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Microscope className="h-5 w-5 text-white" />
              </div>
              AI Food Quality Scanner
            </h1>
            <p className="text-muted-foreground mt-1">
              Computer vision-powered rotten food detection — powered by TensorFlow.js
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-xs px-3 py-1.5 gap-1.5 shadow-lg">
            <Sparkles className="h-3 w-3" /> AI-Powered
          </Badge>
        </div>

        {/* ── Main Content: Tabs ───────────────────────────────────────────── */}
        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
            <TabsTrigger value="scanner" className="gap-1.5">
              <Scan className="h-4 w-4" /> Scanner
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" /> Scan History
            </TabsTrigger>
          </TabsList>

          {/* ════════════════ SCANNER TAB ════════════════ */}
          <TabsContent value="scanner" className="space-y-6">
            {!modelLoadState.ready && (
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">Preparing dataset-trained AI model</p>
                          <p className="text-xs text-muted-foreground">
                            {modelLoadState.error || modelLoadState.message}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {modelLoadState.progress}%
                        </Badge>
                      </div>
                      <Progress value={modelLoadState.progress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">

              {/* ── LEFT: Upload / Camera ──────────────────────────────────── */}
              <Card className={`overflow-hidden border-2 transition-all duration-300 ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-xl shadow-purple-500/10'
                  : cfg
                    ? `${cfg.border} shadow-lg ${cfg.glow}`
                    : 'border-dashed border-purple-300 dark:border-purple-700'
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-purple-600" />
                      Food Image Input
                    </span>
                    <div className="flex gap-2">
                      {!cameraActive ? (
                        <Button size="sm" variant="outline" onClick={startCamera} className="text-xs gap-1.5">
                          <Video className="h-3.5 w-3.5" /> Camera
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant={autoCapture ? 'default' : 'outline'}
                            onClick={() => setAutoCapture(prev => !prev)}
                            className={`text-xs gap-1.5 ${autoCapture ? 'bg-purple-600 animate-pulse' : ''}`}
                          >
                            <Focus className="h-3.5 w-3.5" />
                            {autoCapture ? 'Auto-Scan ON' : 'Touchless'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={captureFrame} className="text-xs gap-1.5">
                            <Camera className="h-3.5 w-3.5" /> Capture
                          </Button>
                          <Button size="sm" variant="ghost" onClick={stopCamera} className="text-xs">
                            <VideoOff className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Camera view */}
                  {cameraActive && (
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        autoPlay playsInline muted
                        className="w-full h-64 object-cover"
                      />
                      {autoCapture && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-purple-600 animate-pulse gap-1.5 text-xs">
                            <Focus className="h-3 w-3" /> Touchless Auto-Scanning
                          </Badge>
                        </div>
                      )}
                      {/* Auto-scan result overlay */}
                      {analysisResult && autoCapture && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-3 left-3 right-3"
                        >
                          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/70 backdrop-blur-md border ${cfg.border}`}>
                            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                            <span className={`font-bold text-sm ${cfg.color}`}>{analysisResult.statusLabel}</span>
                            <span className="ml-auto text-white font-bold text-lg">{analysisResult.freshnessScore}%</span>
                          </div>
                        </motion.div>
                      )}
                      {/* Scanning overlay */}
                      {scanning && autoCapture && (
                        <div className="absolute inset-0 pointer-events-none">
                          <motion.div
                            animate={{ y: ['0%', '100%', '0%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload area (when no camera and no preview) */}
                  {!cameraActive && !preview && (
                    <motion.label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`flex flex-col items-center justify-center gap-4 w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        isDragging
                          ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/30'
                          : 'border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
                      }`}
                    >
                      <motion.div
                        animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                        className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl"
                      >
                        {isDragging ? (
                          <Download className="h-8 w-8 text-white" />
                        ) : (
                          <Upload className="h-8 w-8 text-white" />
                        )}
                      </motion.div>
                      <div className="text-center">
                        <p className="font-semibold">{isDragging ? 'Drop image here' : 'Upload Food Image'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Drag & drop, click to browse, or use camera
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          JPG, PNG, WEBP — max 10MB
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </motion.label>
                  )}

                  {/* Image preview */}
                  {preview && !cameraActive && (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden group">
                        <img
                          ref={imgRef}
                          src={showHeatmap && heatmapUrl ? heatmapUrl : preview}
                          alt="Food to analyze"
                          className="w-full h-64 object-cover transition-all duration-500"
                        />

                        {/* Scan animation overlay */}
                        <AnimatePresence>
                          {scanning && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
                            >
                              <motion.div
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                              />
                              <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-3" />
                              <p className="text-white font-medium text-sm">
                                {scanPhase === 'loading_model' && '🧠 Loading AI Model...'}
                                {scanPhase === 'analyzing' && '🔬 Running Neural Network...'}
                                {scanPhase === 'heatmap' && '🎨 Generating Spoilage Heatmap...'}
                                {scanPhase === 'done' && '✨ Computing Results...'}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Bounding Boxes (Object detection) */}
                        {analysisResult?.detectedObjects?.map((obj, idx) => (
                           <motion.div 
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={{ 
                                left: `${(obj.bbox[0] / imgRef.current?.naturalWidth) * 100}%`,
                                top: `${(obj.bbox[1] / imgRef.current?.naturalHeight) * 100}%`,
                                width: `${(obj.bbox[2] / imgRef.current?.naturalWidth) * 100}%`,
                                height: `${(obj.bbox[3] / imgRef.current?.naturalHeight) * 100}%`
                              }}
                              className="absolute border-2 border-purple-400 bg-purple-400/10 pointer-events-none rounded-sm z-10"
                           >
                              <Badge className="absolute -top-6 left-0 bg-purple-600 text-[10px] py-0 px-1.5 h-5 flex items-center gap-1">
                                 <Scan className="h-2.5 w-2.5" />
                                 {obj.class} ({Math.round(obj.score * 100)}%)
                              </Badge>
                           </motion.div>
                        ))}

                        {/* Result badge overlay */}
                        {analysisResult && !scanning && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute bottom-3 left-3 right-3"
                          >
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/70 backdrop-blur-md border ${cfg.border}`}>
                              <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                              <span className={`font-bold text-sm ${cfg.color}`}>{analysisResult.statusLabel}</span>
                              <span className="ml-auto text-white font-bold text-lg">{analysisResult.freshnessScore}%</span>
                            </div>
                          </motion.div>
                        )}

                        {/* Close / heatmap toggle */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          {heatmapUrl && (
                            <button
                              onClick={() => setShowHeatmap(prev => !prev)}
                              className="h-8 px-2.5 rounded-full bg-black/50 flex items-center gap-1.5 text-white text-xs hover:bg-black/70 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {showHeatmap ? 'Original' : 'Heatmap'}
                            </button>
                          )}
                          <button
                            onClick={handleReset}
                            className="h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!analysisResult && (
                        <div className="flex gap-3">
                          <Button
                            onClick={runScan}
                            disabled={scanning || !modelLoadState.ready}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20"
                          >
                            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                            {scanning ? 'Analyzing...' : !modelLoadState.ready ? 'Preparing AI Model...' : 'Run AI Quality Scan'}
                          </Button>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning || !modelLoadState.ready}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Post-scan actions */}
                      {analysisResult && (
                        <div className="flex gap-3">
                          <Button
                            onClick={handleSave}
                            disabled={saving || !currentUser?.uid}
                            className={`flex-1 bg-gradient-to-r ${cfg.gradient} shadow-lg`}
                          >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {saving ? 'Saving...' : !currentUser?.uid ? 'Sign In to Save' : 'Save to History'}
                          </Button>
                          <Button variant="outline" onClick={handleReset} className="gap-1.5">
                            <RotateCcw className="h-4 w-4" /> New Scan
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── RIGHT: Results Panel ───────────────────────────────────── */}
              <div className="space-y-6">
                
                {scanning && !analysisResult && (
                   <Card className="border-2 border-purple-300 dark:border-purple-700 animate-pulse">
                     <CardContent className="flex flex-col items-center justify-center py-16">
                       <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                       <p className="font-medium text-purple-700 dark:text-purple-400">Running analysis...</p>
                       <p className="text-xs text-muted-foreground mt-1">MobileNet v2 + Sensor Logic</p>
                     </CardContent>
                   </Card>
                )}
                {/* Empty state */}
                {!analysisResult && !scanning && (
                  <Card className="border-2 border-dashed border-muted">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/50 dark:to-indigo-950/50 flex items-center justify-center mb-4">
                        <BarChart3 className="h-10 w-10 text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">Analysis Results</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Upload a food image or use the camera to get an AI-powered quality assessment
                      </p>
                      <div className="flex gap-2 mt-6">
                        <Badge variant="outline" className="gap-1 text-xs"><ShieldCheck className="h-3 w-3 text-green-600" /> Fresh</Badge>
                        <Badge variant="outline" className="gap-1 text-xs"><ShieldAlert className="h-3 w-3 text-amber-600" /> Semi-Rotten</Badge>
                        <Badge variant="outline" className="gap-1 text-xs"><ShieldX className="h-3 w-3 text-red-600" /> Rotten</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata Inputs */}
                {!analysisResult && !scanning && (
                  <Card>
                    <CardHeader className="pb-3 text-sm font-semibold flex flex-row items-center gap-2">
                       <Thermometer className="h-4 w-4 text-purple-600" /> Quality Parameters
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Temperature (°C)</Label>
                          <div className="flex items-center gap-2">
                             <Input 
                                type="number" 
                                value={metadata.temperature}
                                onChange={(e) => setMetadata(m => ({...m, temperature: parseInt(e.target.value) || 0}))}
                                className="h-9"
                             />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Days Since Purchase</Label>
                          <Input 
                            type="number" 
                            value={metadata.daysOld}
                            onChange={(e) => setMetadata(m => ({...m, daysOld: parseInt(e.target.value) || 0}))}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Storage Condition</Label>
                        <Select 
                          value={metadata.storageType} 
                          onValueChange={(v) => setMetadata(m => ({...m, storageType: v}))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select storage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="room">Room Temp (Fast decay)</SelectItem>
                            <SelectItem value="fridge">Refrigerated (Slow decay)</SelectItem>
                            <SelectItem value="freezer">Frozen (Long shelf life)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <Info className="h-3 w-3" /> These parameters help the AI calculate a more accurate quality score.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Results placeholder or scanning state... */}

                {/* Results */}
                {analysisResult && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Score card */}
                    <Card className={`border-2 ${cfg.border} shadow-lg ${cfg.glow}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          {/* Circular score */}
                          <div className="relative h-28 w-28 shrink-0">
                            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                              <motion.circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={analysisResult.statusColor}
                                strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - analysisResult.freshnessScore / 100) }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-3xl font-bold ${cfg.color}`}>{analysisResult.freshnessScore}</span>
                              <span className="text-[10px] text-muted-foreground">freshness</span>
                            </div>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-6 w-6 ${cfg.color}`} />
                              <h3 className={`font-bold text-xl ${cfg.color}`}>{analysisResult.statusLabel}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingDown className="h-4 w-4 text-muted-foreground" />
                              <span>Spoilage Severity: <strong className={cfg.color}>{analysisResult.spoilagePercent}%</strong></span>
                            </div>
                            {analysisResult.isFoodDetected ? (
                              <p className="text-sm text-muted-foreground">
                                Detected: <span className="font-medium capitalize">{analysisResult.topClassification.replace(/_/g, ' ')}</span>
                                <span className="text-xs ml-1">({analysisResult.classificationConfidence}% conf.)</span>
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5" /> Visual analysis only — no standard food item matched
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Spoilage indicators */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Dark Spots', value: analysisResult.spoilageIndicators.darkSpots, icon: '🔍', danger: 15 },
                        { label: 'Mold Risk', value: analysisResult.spoilageIndicators.moldRisk, icon: '🦠', danger: 10 },
                        { label: 'Mushiness / Bruising', value: analysisResult.spoilageIndicators.mushiness, icon: '✋', danger: 15 },
                        { label: 'Bacteria/Slime', value: analysisResult.spoilageIndicators.bacteria, icon: '🧪', danger: 15 },
                      ].map((ind, i) => (
                        <motion.div
                          key={ind.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * i }}
                        >
                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span>{ind.icon}</span>
                                <span className="text-xs font-medium text-muted-foreground">{ind.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={ind.value} className="flex-1 h-2" />
                                <span className={`text-xs font-bold ${
                                  ind.reverse
                                    ? (ind.value > 50 ? 'text-green-600' : 'text-red-600')
                                    : (ind.value > (ind.danger || 15) ? 'text-red-600' : 'text-green-600')
                                }`}>
                                  {ind.value}%
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* View details button */}
                    <Button
                      variant="outline"
                      onClick={() => setShowDetails(true)}
                      className="w-full gap-1.5 text-sm"
                    >
                      <Eye className="h-4 w-4" /> View Full ML Analysis
                    </Button>

                    {/* Rotten food alert */}
                    {analysisResult.status === 'rotten' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4"
                      >
                        <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Critical Food Safety Alert</p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            This food shows significant signs of spoilage and should NOT be consumed or distributed.
                            Discard safely and notify the source immediately.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {analysisResult.status === 'semi-rotten' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
                      >
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Caution — Partial Spoilage Detected</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            This food shows early signs of deterioration. Inspect carefully before use.
                            Consider prioritizing for immediate consumption.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ════════════════ HISTORY TAB ════════════════ */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-600" />
                  Your Scan History
                  {scanHistory.length > 0 && (
                    <Badge variant="secondary">{scanHistory.length} scans</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!historyLoaded ? (
                  <div className="py-12 flex flex-col items-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm">Loading scan history...</p>
                  </div>
                ) : scanHistory.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Microscope className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p className="font-medium">No scans yet</p>
                    <p className="text-sm mt-1">Start scanning food to build your quality history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.map((scan, i) => {
                      const sCfg = STATUS_CFG[scan.status] || STATUS_CFG.fresh;
                      const SIcon = sCfg.icon;
                      return (
                        <motion.div
                          key={scan.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 ${sCfg.border} ${sCfg.bg} transition-shadow hover:shadow-md`}
                        >
                          {/* Scan image */}
                          {(scan.image || scan.imageUrl) && (
                            <img
                              src={scan.image || scan.imageUrl}
                              alt="Scan"
                              className="h-16 w-16 rounded-lg object-cover border shadow-sm"
                            />
                          )}

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <SIcon className={`h-4 w-4 ${sCfg.color}`} />
                              <span className={`text-sm font-bold ${sCfg.color}`}>{scan.statusLabel}</span>
                              <Badge variant="outline" className="text-[10px]">
                                Score: {scan.freshnessScore}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {scan.topClassification && (
                                <span className="capitalize">{scan.topClassification.replace(/_/g, ' ')} • </span>
                              )}
                              Spoilage: {scan.spoilagePercent}%
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {scan.createdAt?.toLocaleString?.() ?? 'Just now'}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0">
                            <p className={`text-2xl font-bold ${sCfg.color}`}>{scan.freshnessScore}%</p>
                            <p className="text-[10px] text-muted-foreground">freshness</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── How It Works ─────────────────────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-200" /> How It Works
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Upload / Capture', desc: 'Upload a photo, drag & drop, or use live camera', icon: <Camera className="h-6 w-6" /> },
                { step: '2', title: 'AI Analysis', desc: 'MobileNet v2 + pixel-level analysis via WebGL', icon: <Microscope className="h-6 w-6" /> },
                { step: '3', title: 'Quality Report', desc: 'Fresh / Semi-Rotten / Rotten with confidence %', icon: <BarChart3 className="h-6 w-6" /> },
                { step: '4', title: 'Save & Track', desc: 'Results saved to Firebase with full history', icon: <History className="h-6 w-6" /> },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-purple-100 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Full Analysis Dialog ───────────────────────────────────────────── */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Detailed ML Analysis
            </DialogTitle>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="Analyzed" className="w-full h-40 object-cover rounded-lg" />
              )}

              {/* ML predictions */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" /> Neural Network Classifications
                </h4>
                <div className="space-y-2">
                  {analysisResult.predictions.map((pred, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-medium capitalize">{pred.label.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">{pred.confidence}%</span>
                        </div>
                        <Progress value={pred.confidence} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pixel analysis */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Microscope className="h-4 w-4 text-indigo-600" /> Pixel-Level Decomposition
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(analysisResult.spoilageIndicators).map(([key, val]) => (
                    <div key={key} className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="text-xl font-bold">{val}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verdict summary */}
              <div className={`rounded-xl p-4 ${cfg?.bg} border-2 ${cfg?.border}`}>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${cfg?.color}`} />
                  <div>
                    <p className={`font-bold ${cfg?.color}`}>Verdict: {analysisResult.statusLabel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Freshness: {analysisResult.freshnessScore}/100 • Spoilage: {analysisResult.spoilagePercent}%
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center italic">
                AI analysis is assistive only. Model: MobileNet v2 + Custom Pixel Heuristics • TF.js WebGL
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
