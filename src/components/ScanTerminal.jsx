import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Loader2 } from 'lucide-react';

export default function ScanTerminal({ logs, isScanning, progress, totalFiles }) {
    const terminalRef = useRef(null);

    // Auto-scroll to bottom when new logs appear
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <AnimatePresence>
            {isScanning && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-40 flex items-center justify-center bg-cyber-bg/90 backdrop-blur-sm"
                >
                    <div className="w-full max-w-2xl mx-4">
                        {/* Terminal Window */}
                        <div className="glass rounded-2xl border border-cyber-border overflow-hidden">
                            {/* Terminal Header */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-cyber-border bg-cyber-panel/50">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                </div>
                                <div className="flex items-center gap-2 text-node-stdlib text-sm">
                                    <Terminal className="w-4 h-4" />
                                    <span className="font-mono">PyNexus Terminal</span>
                                </div>
                                <div className="ml-auto">
                                    <Loader2 className="w-4 h-4 text-cta-primary animate-spin" />
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-4 py-2 border-b border-cyber-border/50">
                                <div className="flex items-center justify-between text-xs text-node-stdlib mb-1">
                                    <span>Progression</span>
                                    <span>{progress} / {totalFiles || '?'} fichiers</span>
                                </div>
                                <div className="h-2 bg-cyber-bg rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-node-file via-cta-primary to-cyber-highlight"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: totalFiles > 0 ? `${(progress / totalFiles) * 100}%` : '0%'
                                        }}
                                        transition={{ duration: 0.3 }}
                                        style={{
                                            boxShadow: '0 0 10px rgba(0, 255, 0, 0.5), 0 0 20px rgba(0, 255, 0, 0.3)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Terminal Content */}
                            <div
                                ref={terminalRef}
                                className="h-64 overflow-y-auto p-4 font-mono text-sm space-y-1"
                            >
                                {logs.map((log, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' :
                                                log.type === 'success' ? 'text-cta-primary' :
                                                    log.type === 'info' ? 'text-cyber-highlight' :
                                                        'text-node-stdlib'
                                            }`}
                                    >
                                        <span className="text-node-stdlib/50 select-none">{'>'}</span>
                                        <span>{log.message}</span>
                                    </motion.div>
                                ))}

                                {/* Blinking cursor */}
                                <motion.span
                                    className="inline-block w-2 h-4 bg-cta-primary ml-4"
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                />
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-cyber-border/50 text-xs text-node-stdlib/70">
                                <span>Appuyez sur Échap pour annuler</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
