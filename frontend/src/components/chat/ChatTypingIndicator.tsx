import { motion } from 'framer-motion';

export const ChatTypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
};
