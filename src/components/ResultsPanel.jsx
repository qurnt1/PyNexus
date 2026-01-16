import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Copy, Check, Save, Loader2, Terminal, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { getPackageVersions, generateRequirementsTxt } from '../utils/pypiApi';

export default function ResultsPanel({ thirdPartyImports, isVisible, directoryHandle, onToast }) {
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPackages, setShowPackages] = useState(true);
    const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

    const generatePipCommand = useCallback(() => {
        if (thirdPartyImports.length === 0) return '';
        return `pip install ${thirdPartyImports.join(' ')}`;
    }, [thirdPartyImports]);

    const handleCopyCommand = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(generatePipCommand());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [generatePipCommand]);

    const downloadFile = (content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'requirements.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleWriteToFolder = useCallback(async () => {
        setIsGenerating(true);
        try {
            const versions = await getPackageVersions(thirdPartyImports);
            const content = generateRequirementsTxt(thirdPartyImports, versions);
            if (directoryHandle && isFileSystemAccessSupported) {
                try {
                    const fileHandle = await directoryHandle.getFileHandle('requirements.txt', { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    onToast(`✅ requirements.txt saved to "${directoryHandle.name}"`, 'success');
                } catch {
                    downloadFile(content);
                    onToast('Downloaded (direct write unavailable)', 'success');
                }
            } else {
                downloadFile(content);
                onToast('requirements.txt downloaded', 'success');
            }
        } catch (error) {
            console.error('Failed to generate:', error);
            onToast('Error generating file', 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [thirdPartyImports, directoryHandle, isFileSystemAccessSupported, onToast]);

    if (!isVisible || thirdPartyImports.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-6 top-24 bottom-6 w-80 glass rounded-2xl border border-cyber-border overflow-hidden flex flex-col z-30"
        >
            <div className="p-4 border-b border-cyber-border">
                <div className="flex items-center gap-2 mb-1">
                    <Package className="w-5 h-5 text-node-import" />
                    <h2 className="font-orbitron text-white font-semibold">Dependencies</h2>
                </div>
                <p className="text-xs text-node-stdlib">{thirdPartyImports.length} third-party package{thirdPartyImports.length > 1 ? 's' : ''} detected</p>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <button onClick={() => setShowPackages(!showPackages)} className="flex items-center justify-between px-4 py-3 text-sm text-node-stdlib hover:bg-cyber-border/30 transition-colors">
                    <span>Package List</span>
                    {showPackages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                    {showPackages && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="max-h-48 overflow-y-auto px-4 pb-3">
                                <div className="flex flex-wrap gap-2">
                                    {thirdPartyImports.map((pkg, index) => (
                                        <motion.span key={pkg} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 }} className="px-2 py-1 bg-node-import/20 text-node-import text-xs rounded-md border border-node-import/30 font-mono">
                                            {pkg}
                                        </motion.span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 border-t border-cyber-border space-y-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-node-stdlib">
                        <Terminal className="w-3 h-3" />
                        <span>Install Command</span>
                    </div>
                    <div className="relative">
                        <div className="bg-cyber-bg/80 rounded-lg p-3 pr-10 font-mono text-xs text-cyber-highlight overflow-x-auto">
                            <code className="whitespace-nowrap">{generatePipCommand()}</code>
                        </div>
                        <button onClick={handleCopyCommand} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-cyber-border/50 rounded-md transition-colors" title="Copy to clipboard">
                            {copied ? <Check className="w-4 h-4 text-cta-primary" /> : <Copy className="w-4 h-4 text-node-stdlib" />}
                        </button>
                    </div>
                </div>

                <button onClick={handleWriteToFolder} disabled={isGenerating} className="w-full flex flex-col items-center justify-center gap-1 py-3 px-4 bg-cta-primary text-cta-text font-orbitron font-semibold rounded-lg hover:shadow-glow-green transition-all disabled:opacity-50">
                    <div className="flex items-center gap-2">
                        {isGenerating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /><span>Fetching versions...</span></>
                        ) : directoryHandle && isFileSystemAccessSupported ? (
                            <><Save className="w-4 h-4" /><span>Save requirements.txt</span></>
                        ) : (
                            <><Download className="w-4 h-4" /><span>Download requirements.txt</span></>
                        )}
                    </div>
                    <span className="text-[10px] font-normal opacity-80">
                        {directoryHandle && isFileSystemAccessSupported ? `Saves directly to "${directoryHandle.name}"` : 'Versions fetched from PyPI'}
                    </span>
                </button>
            </div>
        </motion.div>
    );
}
