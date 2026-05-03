import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatPanel } from './ChatPanel';

const bubbleVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
};

export const ChatBubbleButton: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isPanelOpen = useChatStore((s) => s.isPanelOpen);
  const togglePanel = useChatStore((s) => s.togglePanel);

  if (!isAuthenticated) return null;

  return (
    <>
      <AnimatePresence>
        {!isPanelOpen && (
          <motion.button
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full
              bg-primary text-primary-foreground shadow-clay-md
              flex items-center justify-center
              hover:shadow-clay-lg transition-shadow"
            variants={bubbleVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePanel}
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPanelOpen && <ChatPanel />}
      </AnimatePresence>
    </>
  );
};
