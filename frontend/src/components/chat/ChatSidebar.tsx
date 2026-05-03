import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, Trash2, Check, X, Pencil } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import type { ChatSession } from '@/types/chat';

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isActive, onSelect, onDelete, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setIsEditing(false); setEditTitle(session.title); }
  };

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-standard cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/50 text-foreground'
      }`}
      onClick={() => { if (!isEditing) onSelect(); }}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-background border border-border rounded px-2 py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-0.5 text-primary hover:text-primary/80">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditTitle(session.title); }} className="p-0.5 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm truncate">{session.title}</span>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-muted-foreground hover:text-destructive rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const ChatSidebar: React.FC = () => {
  const { t } = useTranslation();
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const startNewChat = useChatStore((s) => s.startNewChat);
  const selectSession = useChatStore((s) => s.selectSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const updateSessionTitle = useChatStore((s) => s.updateSessionTitle);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-standard
            bg-primary text-primary-foreground text-sm font-medium
            hover:bg-primary/90 transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" />
          {t('chat.new_chat')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('chat.no_sessions')}</p>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onSelect={() => selectSession(session.id)}
              onDelete={() => {
                if (confirm(t('chat.confirm_delete'))) deleteSession(session.id);
              }}
              onRename={(title) => updateSessionTitle(session.id, title)}
            />
          ))
        )}
      </div>
    </div>
  );
};
