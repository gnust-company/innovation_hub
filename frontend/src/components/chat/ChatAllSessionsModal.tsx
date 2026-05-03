import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { ChatSidebar } from './ChatSidebar';

interface ChatAllSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatAllSessionsModal: React.FC<ChatAllSessionsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('chat.sessions_title')} size="md">
      <div className="h-[400px]">
        <ChatSidebar />
      </div>
    </Modal>
  );
};
