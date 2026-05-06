import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, MessageSquarePlus, PanelLeftClose, PanelLeft, Maximize2, Minimize2, KeyRound, ExternalLink, Bot } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usersApi } from '@/api/users';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';

const CHAT_WIDTH = 400;
const SIDEBAR_WIDTH = 200;

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } },
};

const mobileVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.15 } },
};

const fullscreenVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Full-area view when user hasn't configured their API key yet. */
const NoApiKeyView: React.FC<{ helpUrl: string }> = ({ helpUrl }) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <KeyRound className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{t('chat.no_key_heading')}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[260px]">
        {t('chat.no_key_desc')}
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <a
          href="/settings"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('chat.no_key_setup')}
        </a>
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-primary-600 hover:underline"
          >
            {t('chat.no_key_guide')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

export const ChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const closePanel = useChatStore((s) => s.closePanel);
  const showSidebar = useChatStore((s) => s.showSidebar);
  const setShowSidebar = useChatStore((s) => s.setShowSidebar);
  const isFullscreen = useChatStore((s) => s.isFullscreen);
  const toggleFullscreen = useChatStore((s) => s.toggleFullscreen);
  const startNewChat = useChatStore((s) => s.startNewChat);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [helpUrl, setHelpUrl] = useState('');

  useEffect(() => {
    usersApi.checkLlmApiKey().then(r => setHasApiKey(r.has_key)).catch(() => setHasApiKey(false));
    usersApi.getKeyHelpUrl().then(r => setHelpUrl(r.url)).catch(() => {});
  }, []);

  const needsKey = hasApiKey === false;
  const loading = hasApiKey === null;
  const panelTitle = needsKey ? t('chat.no_key_title') : (currentSessionId ? t('chat.title') : t('chat.new_chat'));

  // Don't render until API key check completes — avoids flash of wrong view
  if (loading) return null;

  const handleNewChat = () => {
    startNewChat();
  };

  // ── No API Key: full-panel view, no sidebar ──
  if (needsKey) {
    return (
      <>
        {/* Mobile */}
        <motion.div
          className="fixed inset-0 z-50 bg-card flex flex-col md:hidden"
          variants={mobileVariants} initial="hidden" animate="visible" exit="exit"
        >
          <SimpleHeader title={panelTitle} onClose={closePanel} />
          <NoApiKeyView helpUrl={helpUrl} />
        </motion.div>

        {/* Desktop normal panel */}
        {!isFullscreen && (
          <motion.div
            className="hidden md:flex fixed bottom-24 right-6 z-50 h-[600px] w-[400px]
              bg-card border border-border rounded-feature shadow-clay-lg
              flex-col overflow-hidden"
            variants={panelVariants} initial="hidden" animate={panelVariants.visible} exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <SimpleHeader title={panelTitle} onClose={closePanel} onToggleFullscreen={toggleFullscreen} />
            <NoApiKeyView helpUrl={helpUrl} />
          </motion.div>
        )}

        {/* Desktop fullscreen */}
        {isFullscreen && (
          <motion.div
            className="hidden md:flex fixed top-16 left-0 right-0 bottom-0 z-50 bg-card border-t border-border flex-col"
            variants={fullscreenVariants} initial="hidden" animate="visible" exit="exit"
          >
            <SimpleHeader title={panelTitle} onClose={closePanel} onToggleFullscreen={toggleFullscreen} />
            <NoApiKeyView helpUrl={helpUrl} />
          </motion.div>
        )}
      </>
    );
  }

  // ── Normal chat view ──
  const chatContent = (
    <>
      <ChatMessageList />
      <ChatMessageInput />
    </>
  );

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <motion.div
        className="fixed inset-0 z-50 bg-card flex flex-col md:hidden"
        variants={mobileVariants} initial="hidden" animate="visible" exit="exit"
      >
        <ChatPanelHeader
          title={panelTitle}
          onClose={closePanel}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onNewChat={handleNewChat}
          showSidebar={showSidebar}
        />
        <div className="flex-1 overflow-hidden flex">
          {showSidebar ? (
            <div className="flex-1 overflow-hidden">
              <ChatSidebar />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {chatContent}
            </div>
          )}
        </div>
      </motion.div>

      {/* Desktop: fullscreen */}
      {isFullscreen && (
        <motion.div
          className="hidden md:flex fixed top-16 left-0 right-0 bottom-0 z-50 bg-card border-t border-border flex-col"
          variants={fullscreenVariants} initial="hidden" animate="visible" exit="exit"
        >
          <ChatPanelHeader
            title={panelTitle}
            onClose={closePanel}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onNewChat={handleNewChat}
            showSidebar={showSidebar}
            isFullscreen={true}
            onToggleFullscreen={toggleFullscreen}
          />
          <div className="flex-1 flex overflow-hidden">
            <motion.div
              className="border-r border-border overflow-hidden flex-shrink-0"
              animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div style={{ width: SIDEBAR_WIDTH }} className="h-full">
                <ChatSidebar />
              </div>
            </motion.div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {chatContent}
            </div>
          </div>
        </motion.div>
      )}

      {/* Desktop: normal panel */}
      {!isFullscreen && (
        <motion.div
          className="hidden md:flex fixed bottom-24 right-6 z-50 h-[600px]
            bg-card border border-border rounded-feature shadow-clay-lg
            flex-col overflow-hidden"
          variants={panelVariants}
          initial="hidden"
          animate={{
            ...panelVariants.visible,
            width: showSidebar ? CHAT_WIDTH + SIDEBAR_WIDTH : CHAT_WIDTH,
          }}
          exit="exit"
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <ChatPanelHeader
            title={panelTitle}
            onClose={closePanel}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onNewChat={handleNewChat}
            showSidebar={showSidebar}
            isFullscreen={false}
            onToggleFullscreen={toggleFullscreen}
          />
          <div className="flex-1 flex overflow-hidden">
            <motion.div
              className="border-r border-border overflow-hidden flex-shrink-0"
              animate={{ width: showSidebar ? SIDEBAR_WIDTH : 0, opacity: showSidebar ? 1 : 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div style={{ width: SIDEBAR_WIDTH }} className="h-full">
                <ChatSidebar />
              </div>
            </motion.div>
            <div style={{ width: CHAT_WIDTH, flexShrink: 0 }} className="flex flex-col overflow-hidden">
              {chatContent}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

interface HeaderProps {
  title: string;
  onClose: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  showSidebar: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ChatPanelHeader: React.FC<HeaderProps> = ({
  title, onClose, onToggleSidebar, onNewChat, showSidebar,
  isFullscreen, onToggleFullscreen,
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
      >
        {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onNewChat}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="New chat"
      >
        <MessageSquarePlus className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/** Minimal header for no-key view — no sidebar toggle, no new chat. */
const SimpleHeader: React.FC<{ title: string; onClose: () => void; onToggleFullscreen?: () => void }> = ({
  title, onClose, onToggleFullscreen,
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
    <div className="flex items-center gap-2">
      <div className="p-1.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
    <div className="flex items-center gap-1">
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onClose}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
