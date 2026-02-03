import React, { useState, useEffect } from 'react';
import { analyzeText } from './services/geminiService';
import { saveRecord, fetchHistory } from './services/supabaseClient';
import { AnalysisResult, DatabaseRecord, ViewMode } from './types';
import AnnotationView from './components/AnnotationView';
import BatchProcessor from './components/BatchProcessor';
import StatisticsView from './components/StatisticsView';
import StatsSummary from './components/StatsSummary';
import { 
  BookOpen, 
  History, 
  PenTool, 
  Layers, 
  Loader2, 
  ArrowRight, 
  AlertTriangle,
  Database,
  BarChart2,
  ChevronRight,
  XCircle,
  Settings,
  X,
  Save
} from 'lucide-react';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<DatabaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Batch Processing State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  useEffect(() => {
    loadHistory();
    const storedKey = localStorage.getItem('api_base_url');
    if (storedKey) setApiBaseUrl(storedKey);
  }, []);

  const loadHistory = async () => {
    const data = await fetchHistory();
    setHistory(data);
  };

  const handleSaveApiUrl = () => {
    localStorage.setItem('api_base_url', apiBaseUrl.trim());
    setShowSettings(false);
    setError(null); // Clear any previous auth errors
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setCurrentResult(null);

    try {
      const result = await analyzeText(inputText);
      setCurrentResult(result);
      await saveRecord(result);
      await loadHistory(); // Refresh history
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
      // If it's an auth error, open settings automatically to help the user
      if (err.message?.includes('API URL')) {
        setShowSettings(true);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistoryItemClick = (record: DatabaseRecord) => {
    setCurrentResult({
      original_text: record.original_text,
      corrected_text: record.corrected_text,
      annotations: record.annotations
    });
    setViewMode('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <PenTool className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ESL Annotator</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setViewMode('batch')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                  viewMode === 'batch' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Batch
                {isBatchProcessing && <Loader2 size={12} className="animate-spin text-blue-500" />}
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setViewMode('statistics')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'statistics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Statistics
              </button>
            </nav>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Single Mode */}
        {viewMode === 'single' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <BookOpen size={18} /> Input Text
                </h2>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">RAG Powered</span>
              </div>
              <div className="p-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter English text to analyze (e.g., 'He go to school yesterday.')"
                  className="w-full h-32 p-3 text-lg border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder:text-slate-300"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !inputText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze Text <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                <XCircle className="flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-sm">Analysis Failed</h3>
                  <p className="text-sm mt-1">{error}</p>
                  {error.includes('API Key') && (
                    <button 
                      onClick={() => setShowSettings(true)}
                      className="text-sm font-semibold underline mt-2 hover:text-red-800"
                    >
                      Configure API URL
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentResult && (
              <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Original with Annotations */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Annotated Original</h3>
                    <AnnotationView 
                      originalText={currentResult.original_text} 
                      annotations={currentResult.annotations} 
                    />
                    <p className="text-xs text-slate-400 italic text-center mt-2">
                      Click highlighted text for details
                    </p>
                  </div>

                  {/* Corrected Version */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Corrected Version</h3>
                    <div className="p-6 bg-green-50 rounded-lg border border-green-100 text-lg text-slate-800 leading-relaxed font-serif">
                      {currentResult.corrected_text}
                    </div>
                  </div>
                </div>

                {/* Statistics Side Panel */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    <StatsSummary annotations={currentResult.annotations} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch Mode - Always mounted but hidden if not active to preserve state */}
        <div style={{ display: viewMode === 'batch' ? 'block' : 'none' }} className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Batch Processing</h2>
            <p className="text-slate-500">Analyze multiple sentences or upload a file for bulk annotation.</p>
          </div>
          <BatchProcessor 
            onComplete={loadHistory} 
            onProcessingStateChange={setIsBatchProcessing}
          />
        </div>

        {/* History Mode */}
        {viewMode === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <History className="text-slate-400" /> Analysis History
              </h2>
              <button onClick={loadHistory} className="text-sm text-blue-600 hover:underline">
                Refresh
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <Database className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500">No history found. Start analyzing!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((record) => (
                  <div 
                    key={record.id} 
                    onClick={() => handleHistoryItemClick(record)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-slate-400">
                        {record.created_at ? new Date(record.created_at).toLocaleString() : 'Just now'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                        (record.error_count ?? record.annotations.length) > 0 
                          ? 'bg-red-100 text-red-700 group-hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 group-hover:bg-green-200'
                      }`}>
                        {record.error_count ?? record.annotations.length} Errors
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-grow min-w-0">
                        <p className="text-slate-800 font-medium truncate mb-1">{record.original_text}</p>
                        <p className="text-slate-500 text-sm truncate">{record.corrected_text}</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" size={20} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics Mode */}
        {viewMode === 'statistics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="text-slate-400" /> Error Statistics
              </h2>
              <button onClick={loadHistory} className="text-sm text-blue-600 hover:underline">
                Refresh Data
              </button>
            </div>
            <StatisticsView history={history} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>ESL Error Annotator &copy; {new Date().getFullYear()}</p>
          <p className="text-xs mt-1">Powered by Gemini & Supabase</p>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Settings size={18} /> Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cloud Run API URL
                </label>
                <input
                  type="password"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://your-cloud-run-url"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-mono"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Your API URL is stored locally in your browser and is used to call your Cloud Run backend.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveApiUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                >
                  <Save size={16} /> Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
