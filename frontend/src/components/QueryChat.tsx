import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Code, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { QueryMessage, ChartData } from '../types';
import { ChartRenderer } from './ChartRenderer';

interface QueryChatProps {
  sessionId: string;
  messages: QueryMessage[];
  isLoading: boolean;
  onSendMessage: (query: string) => void;
}

function MessageBubble({ message }: { message: QueryMessage }) {
  const [showCode, setShowCode] = useState(false);
  const isUser = message.type === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-surface" />
        </div>
      )}
      
      <div className={clsx(
        'max-w-[80%] space-y-3',
        isUser && 'order-first'
      )}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl',
          isUser 
            ? 'bg-accent-primary text-surface rounded-tr-sm' 
            : 'glass-panel-solid rounded-tl-sm'
        )}>
          <p className={clsx(
            'whitespace-pre-wrap',
            isUser ? 'text-surface' : 'text-lens-200'
          )}>
            {message.content}
          </p>
        </div>

        {/* Chart */}
        {message.chart && (
          <div className="glass-panel-solid p-4 rounded-2xl">
            <ChartRenderer chart={message.chart} />
          </div>
        )}

        {/* Code Block */}
        {message.code && (
          <div className="glass-panel-solid rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCode(!showCode)}
              className="w-full px-4 py-2 flex items-center justify-between text-sm text-lens-400 hover:text-lens-200 hover:bg-surface-overlay transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                View generated code
              </span>
              {showCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
              {showCode && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <pre className="p-4 text-sm font-mono text-lens-300 bg-surface overflow-x-auto border-t border-surface-highlight">
                    <code>{message.code}</code>
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Execution time */}
        {message.executionTime && (
          <p className="text-xs text-lens-600 px-1">
            Completed in {message.executionTime.toFixed(0)}ms
          </p>
        )}
      </div>
    </motion.div>
  );
}

const SUGGESTION_QUERIES = [
  "Show me a summary of all columns",
  "What are the top 10 values by count?",
  "Create a chart showing the distribution",
  "Find any missing or null values",
  "Calculate the average for numeric columns",
];

export function QueryChat({ sessionId, messages, isLoading, onSendMessage }: QueryChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSendMessage(suggestion);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-accent-primary" />
            </div>
            <h3 className="font-display text-2xl text-lens-100 mb-2">
              Ask anything about your data
            </h3>
            <p className="text-lens-500 max-w-md mb-8">
              Use natural language to explore, analyze, and visualize your dataset
            </p>
            
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTION_QUERIES.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 text-sm text-lens-400 bg-surface-overlay hover:bg-surface-highlight hover:text-lens-200 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-surface animate-spin" />
            </div>
            <div className="glass-panel-solid px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-2 text-lens-400">
                <span>Analyzing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-highlight">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            rows={1}
            className="input-field pr-14 resize-none min-h-[52px] max-h-32"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={clsx(
              'absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !isLoading
                ? 'bg-accent-primary text-surface hover:bg-accent-secondary'
                : 'bg-surface-overlay text-lens-600 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
