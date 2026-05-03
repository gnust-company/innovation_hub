import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, MessageSquarePlus, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
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

export const ChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const closePanel = useChatStore((s) => s.closePanel);
  const showSidebar = useChatStore((s) => s.showSidebar);
  const setShowSidebar = useChatStore((s) => s.setShowSidebar);
  const startNewChat = useChatStore((s) => s.startNewChat);
  const currentSessionId = useChatStore((s) => s.currentSessionId);

  const handleNewChat = () => {
    startNewChat();
  }

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <motion.div
        className="fixed inset-0 z-50 bg-card flex flex-col md:hidden"
        variants={mobileVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <ChatPanelHeader
          title={currentSessionId ? t('chat.title') : t('chat.new_chat')}
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
              <ChatMessageList />
              <ChatMessageInput />
            </div>
          )}
        </div>
      </motion.div>

      {/* Desktop: chat area is ALWAYS CHAT_WIDTH, sidebar adds extra width */}
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
          title={currentSessionId ? t('chat.title') : t('chat.new_chat')}
          onClose={closePanel}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onNewChat={handleNewChat}
          showSidebar={showSidebar}
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
            <ChatMessageList />
            <ChatMessageInput />
          </div>
        </div>
      </motion.div>
    </>
  );
};

interface HeaderProps {
  title: string;
  onClose: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  showSidebar: boolean;
}

const ChatPanelHeader: React.FC<HeaderProps> = ({ title, onClose, onToggleSidebar, onNewChat, showSidebar }) => (
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
        onClick={onClose}
        className="p-1.5 rounded-standard text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
