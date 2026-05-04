import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatThinkingSteps } from './ChatThinkingSteps';
import { useChat } from '@/hooks/useChat';
import { Avatar } from '@/components/ui/Avatar';
import { Bot } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  userAvatarUrl: string | null;
  userName: string | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userAvatarUrl, userName }) => {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const sources = message.sources as { files?: string[] } | null;

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-standard px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none break-words [word-break:break-word] prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-1.5 prose-blockquote:my-1.5 prose-hr:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {sources?.files && sources.files.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="text-xs text-muted-foreground mr-1">{t('chat.sources')}:</span>
            {sources.files.map((file) => (
              <span key={file} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {file.split('/').pop()?.replace('.md', '')}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <Avatar src={userAvatarUrl} name={userName} size="sm" className="mt-1" />
      )}
    </div>
  );
};

interface StreamingBubbleProps {
  content: string;
}

const StreamingBubble: React.FC<StreamingBubbleProps> = ({ content }) => {
  return (
    <div className="flex gap-2 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="max-w-[85%]">
        <div className="rounded-standard px-3 py-2 text-sm leading-relaxed bg-secondary text-foreground">
          {content ? (
            <div className="prose prose-sm max-w-none break-words [word-break:break-word] prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-1.5 prose-blockquote:my-1.5 prose-hr:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <ChatTypingIndicator />
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessageList: React.FC = () => {
  const { sendMessage } = useChat();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const streamingSources = useChatStore((s) => s.streamingSources);
  const streamingSteps = useChatStore((s) => s.streamingSteps);
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasSteps = streamingSteps.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, streamingSteps]);

  if (messages.length === 0 && !isStreaming) {
    return <ChatEmptyState onSuggestionClick={(text) => sendMessage(text)} />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          userAvatarUrl={user?.avatar_url ?? null}
          userName={user?.full_name ?? user?.username ?? null}
        />
      ))}
      {isStreaming && hasSteps && (
        <ChatThinkingSteps steps={streamingSteps} isStreaming={isStreaming} />
      )}
      {isStreaming && !hasSteps && streamingContent === '' && (
        <div className="flex gap-2 justify-start">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="rounded-standard px-3 py-2 bg-secondary">
            <ChatTypingIndicator />
          </div>
        </div>
      )}
      {isStreaming && streamingContent && (
        <StreamingBubble content={streamingContent} />
      )}
      {streamingSources && streamingSources.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-9">
          {streamingSources.map((file) => (
            <span key={file} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {file.split('/').pop()?.replace('.md', '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
