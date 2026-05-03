import { useState } from 'react';
import { ChevronRight, Wrench, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StreamingStep } from '@/types/chat';

interface ChatThinkingStepsProps {
  steps: StreamingStep[];
  isStreaming: boolean;
}

const ToolCallStep: React.FC<{ step: StreamingStep & { type: 'tool_call' }; isLive: boolean }> = ({ step, isLive }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-standard overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <Wrench className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary">{step.name}</span>
        {Object.keys(step.args).length > 0 && (
          <span className="text-xs text-muted-foreground truncate">
            {Object.entries(step.args).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
          </span>
        )}
        {step.result === undefined && isLive && (
          <motion.span
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {step.result !== undefined && (
          <span className="ml-auto text-xs text-green-600">done</span>
        )}
      </button>
      {isOpen && step.result && (
        <div className="px-3 py-2 border-t border-border bg-background text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
          {step.result}
        </div>
      )}
    </div>
  );
};

export const ChatThinkingSteps: React.FC<ChatThinkingStepsProps> = ({ steps, isStreaming }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (steps.length === 0 && !isStreaming) return null;

  return (
    <div className="flex gap-2 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
        <Brain className="w-4 h-4 text-primary" />
      </div>
      <div className="max-w-[85%] flex-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
          <span className="font-medium">
            {isStreaming ? 'Agent is thinking...' : `Agent steps (${steps.length})`}
          </span>
          {isStreaming && (
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </button>
        {!isCollapsed && (
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              step.type === 'thinking' ? (
                <div key={`think-${i}`} className="px-3 py-1.5 rounded-standard bg-secondary/50 text-xs text-muted-foreground italic border-l-2 border-muted-foreground/30">
                  {step.content}
                </div>
              ) : (
                <ToolCallStep key={`tool-${step.runId}`} step={step} isLive={isStreaming} />
              )
            ))}
            {isStreaming && steps.every(s => s.type === 'tool_call' && s.result !== undefined) && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground italic">
                Generating answer...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
