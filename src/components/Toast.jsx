import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', isVisible, onClose }) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            glass rounded-xl px-5 py-4 
            border ${type === 'success' ? 'border-cta-primary/50' : 'border-red-500/50'}
            flex items-center gap-3 min-w-[300px] max-w-md
          `}
                >
                    {/* Icon */}
                    <div className={`flex-shrink-0 ${type === 'success' ? 'text-cta-primary' : 'text-red-400'}`}>
                        {type === 'success' ? (
                            <CheckCircle2 className="w-6 h-6" />
                        ) : (
                            <XCircle className="w-6 h-6" />
                        )}
                    </div>

                    {/* Message */}
                    <p className="flex-1 text-sm text-white font-medium">
                        {message}
                    </p>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 hover:bg-cyber-border/50 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-node-stdlib" />
                    </button>

                    {/* Glow effect */}
                    <motion.div
                        className={`absolute inset-0 rounded-xl opacity-20 blur-xl -z-10 ${type === 'success' ? 'bg-cta-primary' : 'bg-red-500'
                            }`}
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
