import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Github, RotateCcw } from 'lucide-react';
import { FileUpload, DataProfilePanel, QueryChat } from './components';
import type { DataProfile, QueryMessage, QueryResponse } from './types';

type View = 'upload' | 'workspace';

export default function App() {
  const [view, setView] = useState<View>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(true);

  const handleUploadSuccess = useCallback((newSessionId: string, newProfile: DataProfile) => {
    setSessionId(newSessionId);
    setProfile(newProfile);
    setMessages([]);
    setView('workspace');
  }, []);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!sessionId) return;

    const userMessage: QueryMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          query,
          include_code: true,
        }),
      });

      const data: QueryResponse = await response.json();

      const assistantMessage: QueryMessage = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: data.answer,
        chart: data.chart,
        data: data.data,
        code: data.code,
        timestamp: new Date(),
        executionTime: data.execution_time_ms,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: QueryMessage = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleReset = () => {
    setView('upload');
    setSessionId(null);
    setProfile(null);
    setMessages([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-highlight/50 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Search className="w-5 h-5 text-surface" />
            </div>
            <div>
              <h1 className="font-display text-xl text-lens-100">DataLens AI</h1>
              <p className="text-xs text-lens-600">Intelligent Data Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {view === 'workspace' && (
              <button
                onClick={handleReset}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                New Analysis
              </button>
            )}
            <a
              href="https://github.com/yourusername/datalens-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-surface-overlay flex items-center justify-center text-lens-400 hover:text-lens-200 hover:bg-surface-highlight transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center px-6 py-16"
            >
              {/* Hero */}
              <div className="text-center mb-12">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-5xl md:text-6xl text-lens-100 mb-4"
                >
                  Transform data into
                  <br />
                  <span className="text-gradient">insights</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lens-400 text-lg max-w-xl mx-auto"
                >
                  Upload your spreadsheet and ask questions in natural language.
                  Get instant analysis, visualizations, and answers.
                </motion.p>
              </div>

              {/* Upload */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full"
              >
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full"
              >
                {[
                  { title: 'Natural Language', desc: 'Ask questions like you would to a colleague' },
                  { title: 'Smart Charts', desc: 'Automatic visualization suggestions' },
                  { title: 'Data Profiling', desc: 'Instant quality analysis and insights' },
                ].map((feature, i) => (
                  <div key={i} className="glass-panel-solid p-6 text-center">
                    <h3 className="text-lens-200 font-medium mb-2">{feature.title}</h3>
                    <p className="text-lens-500 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-73px)] flex"
            >
              {/* Sidebar - Data Profile */}
              <AnimatePresence>
                {showProfile && profile && (
                  <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-r border-surface-highlight overflow-hidden"
                  >
                    <div className="w-[400px] h-full overflow-y-auto p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lens-300 font-medium">Data Overview</h2>
                        <button
                          onClick={() => setShowProfile(false)}
                          className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center text-lens-500 hover:text-lens-200 hover:bg-surface-highlight transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <DataProfilePanel profile={profile} />
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Chat */}
              <div className="flex-1 flex flex-col">
                {!showProfile && profile && (
                  <div className="p-4 border-b border-surface-highlight">
                    <button
                      onClick={() => setShowProfile(true)}
                      className="btn-secondary text-sm"
                    >
                      Show Data Profile
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <QueryChat
                    sessionId={sessionId!}
                    messages={messages}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer (only on upload page) */}
      {view === 'upload' && (
        <footer className="border-t border-surface-highlight/50 py-6">
          <div className="text-center text-lens-600 text-sm">
            Built with React, FastAPI, and Claude AI
          </div>
        </footer>
      )}
    </div>
  );
}
