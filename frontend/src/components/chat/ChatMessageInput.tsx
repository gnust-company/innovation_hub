import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useChat } from '@/hooks/useChat';

export const ChatMessageInput: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const { sendMessage, stopStreaming } = useChat();

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  }, []);

  useEffect(() => { adjustHeight(); }, [text, adjustHeight]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setText('');
    sendMessage(trimmed);
  }, [text, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-card">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.placeholder')}
        disabled={isStreaming}
        rows={1}
        className="flex-1 resize-none rounded-standard border border-border bg-background px-3 py-2 text-sm
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          disabled:opacity-50 disabled:cursor-not-allowed
          max-h-[120px] overflow-y-hidden"
      />
      {isStreaming ? (
        <button
          onClick={stopStreaming}
          className="flex-shrink-0 w-8 h-8 rounded-standard bg-destructive text-destructive-foreground
            flex items-center justify-center hover:bg-destructive/90 transition-colors"
          title={t('chat.stop')}
        >
          <Square className="w-3.5 h-3.5" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex-shrink-0 w-8 h-8 rounded-standard bg-primary text-primary-foreground
            flex items-center justify-center hover:bg-primary/90 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('chat.send')}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
