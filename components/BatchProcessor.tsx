import React, { useState, useRef, useEffect } from 'react';
import { analyzeText } from '../services/geminiService';
import { saveRecord } from '../services/supabaseClient';
import { AnalysisResult, Annotation } from '../types';
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, PauseCircle, PlayCircle, StopCircle, Eye, AlertTriangle } from 'lucide-react';
import StatsSummary from './StatsSummary';
import AnnotationView from './AnnotationView';

interface BatchProcessorProps {
  onComplete: () => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
}

// Simple CSV parser to handle quoted strings
const parseCSV = (text: string): string[] => {
  const results: string[] = [];
  let current = '';
  let inQuote = false;
  
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < normalized.length && normalized[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === '\n') {
        if (current.trim()) results.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current.trim()) results.push(current.trim());
  return results;
};

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onComplete, onProcessingStateChange }) => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  
  // Display results (limited history for UI performance)
  const [displayResults, setDisplayResults] = useState<AnalysisResult[]>([]);
  // All annotations for accurate statistics
  const [batchAnnotations, setBatchAnnotations] = useState<Annotation[]>([]);
  
  const [latestResult, setLatestResult] = useState<AnalysisResult | null>(null);
  
  const stopRef = useRef(false);
  const pauseRef = useRef(false);

  // Notify parent of processing state
  useEffect(() => {
    if (onProcessingStateChange) {
      onProcessingStateChange(isProcessing);
    }
  }, [isProcessing, onProcessingStateChange]);

  // Prevent accidental tab closure during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing && !isPaused) {
        const message = "Batch processing is active. Closing this tab will stop the process.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing, isPaused]);

  // Update refs when state changes
  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);

  const processQueue = async (items: string[]) => {
    setIsProcessing(true);
    stopRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    
    // Memory optimization: Only keep the last 100 results in the UI list to prevent crashing with 5000+ items
    const MAX_DISPLAY_HISTORY = 100;
    
    for (const text of items) {
      if (stopRef.current) break;
      
      // Handle Pause
      while (pauseRef.current) {
        if (stopRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      try {
        const result = await analyzeText(text);
        
        // Save to DB immediately
        await saveRecord(result);

        // Update State
        setLatestResult(result);
        setDisplayResults(prev => {
          const updated = [result, ...prev];
          return updated.slice(0, MAX_DISPLAY_HISTORY);
        });
        setBatchAnnotations(prev => [...prev, ...result.annotations]);
        setProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
        
      } catch (error) {
        console.error(`Error processing item:`, error);
        const errorResult: AnalysisResult = {
          original_text: text,
          corrected_text: "Error processing this item.",
          annotations: []
        };
        setDisplayResults(prev => {
          const updated = [errorResult, ...prev];
          return updated.slice(0, MAX_DISPLAY_HISTORY);
        });
        setProgress(prev => ({ ...prev, current: prev.current + 1, failed: prev.failed + 1 }));
      }
      
      // Small delay to be nice to the API and UI loop
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsProcessing(false);
    onComplete();
  };

  const handleStart = (inputs: string[]) => {
    setDisplayResults([]);
    setBatchAnnotations([]);
    setLatestResult(null);
    setProgress({ current: 0, total: inputs.length, success: 0, failed: 0 });
    processQueue(inputs);
  };

  const handleTextSubmit = () => {
    const lines = textInput.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return;
    handleStart(lines);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      let lines: string[] = [];
      
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          if (Array.isArray(json)) {
            lines = json.map(item => typeof item === 'string' ? item : JSON.stringify(item));
          }
        } catch (err) {
          alert("Invalid JSON file");
          return;
        }
      } else {
        // Use CSV parser
        lines = parseCSV(content);
      }
      
      const validLines = lines.filter(l => l.trim().length > 0);
      if (validLines.length > 0) {
        handleStart(validLines);
      } else {
        alert("No valid text found in file.");
      }
    };
    reader.readAsText(file);
  };

  const handleStop = () => {
    if (confirm("Are you sure you want to stop processing? Progress will be saved, but the remaining queue will be cleared.")) {
      stopRef.current = true;
      setIsProcessing(false);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleNewBatch = () => {
    setDisplayResults([]);
    setBatchAnnotations([]);
    setLatestResult(null);
    setProgress({ current: 0, total: 0, success: 0, failed: 0 });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Input Section - Only show if not processing and no results yet */}
      {!isProcessing && displayResults.length === 0 && (
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-slate-200 pb-4">
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'text' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'file' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Upload CSV/TXT
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            {inputMode === 'text' ? (
              <div className="space-y-4">
                <textarea
                  className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                  placeholder="Enter multiple sentences, one per line..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  <FileText size={18} />
                  Start Batch Processing
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 font-medium">Click to upload or drag and drop</p>
                <p className="text-slate-400 text-sm mt-1">CSV (text column), TXT (one per line), or JSON array</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing / Results View */}
      {(isProcessing || displayResults.length > 0) && (
        <div className="flex flex-col gap-6">
          
          {/* Warning Banner */}
          {isProcessing && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-pulse">
              <AlertTriangle size={16} />
              <strong>Do not close this tab.</strong> Processing is running locally in your browser. Closing the tab will stop the batch.
            </div>
          )}

          {/* Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30">
            <div className="flex items-center gap-4 flex-grow">
              {isProcessing ? (
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              <div className="flex-grow">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">
                    {isProcessing ? (isPaused ? "Paused" : "Processing...") : "Batch Complete"}
                  </span>
                  <span className="text-slate-500">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${isPaused ? 'bg-amber-400' : 'bg-blue-600'}`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isProcessing && (
                <>
                  <button 
                    onClick={togglePause}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <PlayCircle size={24} /> : <PauseCircle size={24} />}
                  </button>
                  <button 
                    onClick={handleStop}
                    className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                    title="Stop"
                  >
                    <StopCircle size={24} />
                  </button>
                </>
              )}
              {!isProcessing && (
                <button 
                  onClick={handleNewBatch}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  New Batch
                </button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Latest Result View */}
              {latestResult && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2">
                    <Eye size={16} className="text-blue-600" />
                    <span className="text-sm font-bold text-blue-800 uppercase tracking-wider">Latest Analysis</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Original</h4>
                      <AnnotationView 
                        originalText={latestResult.original_text} 
                        annotations={latestResult.annotations} 
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Corrected</h4>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-slate-800 font-serif">
                        {latestResult.corrected_text}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Processed List Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Processed Items</h3>
                  <span className="text-xs text-slate-400">Showing last {Math.min(displayResults.length, 100)} items</span>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 font-semibold text-slate-600 w-1/3">Original</th>
                        <th className="px-6 py-3 font-semibold text-slate-600 w-1/3">Corrected</th>
                        <th className="px-6 py-3 font-semibold text-slate-600 w-1/3">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayResults.map((res, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-800 align-top">
                            <div className="line-clamp-2" title={res.original_text}>{res.original_text}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 align-top">
                            <div className="line-clamp-2" title={res.corrected_text}>{res.corrected_text}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-1">
                              {res.annotations.length > 0 ? (
                                res.annotations.map((ann, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    {ann.error_code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-green-600 flex items-center gap-1 text-xs">
                                  <CheckCircle size={12} /> None
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Side Stats Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <StatsSummary 
                  annotations={batchAnnotations} 
                  title={`Batch Statistics (${progress.current})`} 
                />
                
                {/* Quick Status Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xl font-bold text-green-600">{progress.success}</div>
                      <div className="text-xs text-green-800">Successful</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                      <div className="text-xl font-bold text-red-600">{progress.failed}</div>
                      <div className="text-xs text-red-800">Failed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;