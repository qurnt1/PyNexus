import { motion } from 'framer-motion';
import { Cpu, Sparkles } from 'lucide-react';

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-cyber-border">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo & Title */}
                <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative">
                        <Cpu className="w-8 h-8 text-node-file" />
                        <motion.div
                            className="absolute inset-0 bg-node-file rounded-full opacity-30 blur-md"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                    <div>
                        <h1 className="font-orbitron text-xl font-bold tracking-wider text-white">
                            Py<span className="text-cta-primary">Nexus</span>
                        </h1>
                        <p className="text-xs text-node-stdlib tracking-widest uppercase">
                            Dependency Analyzer Pro
                        </p>
                    </div>
                </motion.div>

                {/* Status Indicator */}
                <motion.div
                    className="flex items-center gap-2 text-sm text-node-stdlib"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Sparkles className="w-4 h-4 text-cyber-highlight" />
                    <span className="font-rajdhani tracking-wide">DIRECT FILE ACCESS</span>
                </motion.div>
            </div>

            {/* Animated scan line */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-highlight to-transparent"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </header>
    );
}
