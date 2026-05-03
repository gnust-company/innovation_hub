import { useTranslation } from 'react-i18next';
import { MessageSquare, Sparkles, Search, BookOpen } from 'lucide-react';

interface ChatEmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}

const suggestions = [
  { icon: Sparkles, textKey: 'chat.suggest_innovation' },
  { icon: Search, textKey: 'chat.suggest_problem' },
  { icon: BookOpen, textKey: 'chat.suggest_idea' },
];

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ onSuggestionClick }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{t('chat.empty_title')}</h3>
      <p className="text-sm text-muted-foreground mb-6">{t('chat.empty_subtitle')}</p>

      <div className="flex flex-col gap-2 w-full max-w-[280px]">
        {suggestions.map(({ icon: Icon, textKey }) => (
          <button
            key={textKey}
            onClick={() => onSuggestionClick?.(t(textKey))}
            className="flex items-center gap-3 px-4 py-2.5 rounded-standard border border-border hover:bg-secondary/50 transition-colors text-left text-sm text-foreground"
          >
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{t(textKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
