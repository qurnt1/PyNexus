import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import DependencyGraph from './components/DependencyGraph';
import ResultsPanel from './components/ResultsPanel';
import ScanTerminal from './components/ScanTerminal';
import Toast from './components/Toast';
import { parseMultipleFiles } from './utils/pythonParser';
import { isStdlibModule } from './utils/stdlibModules';

export default function App() {
    // View state: 'upload' | 'scanning' | 'results'
    const [view, setView] = useState('upload');
    const [analysisData, setAnalysisData] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [directoryHandle, setDirectoryHandle] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

    // Scanning state
    const [logs, setLogs] = useState([]);
    const [scanProgress, setScanProgress] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Auto-hide toast after 4 seconds
    useEffect(() => {
        if (toast.isVisible) {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, isVisible: false }));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast.isVisible]);

    // Handle escape key to cancel scan
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && view === 'scanning') {
                setView('upload');
                addLog({ message: '⚠️ Scan annulé', type: 'error' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view]);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, isVisible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
    }, []);

    const addLog = useCallback((log) => {
        setLogs(prev => [...prev, log]);
    }, []);

    const handleScanStart = useCallback(() => {
        setLogs([]);
        setScanProgress(0);
        setTotalFiles(0);
        setView('scanning');
    }, []);

    const handleScanEnd = useCallback((success) => {
        if (!success) {
            // Stay in scanning view for a moment to show error
            setTimeout(() => {
                setView('upload');
            }, 2000);
        }
        // If success, view will be changed by handleFilesProcessed
    }, []);

    const handleProgress = useCallback((current, total) => {
        setScanProgress(current);
        setTotalFiles(total);
    }, []);

    const handleDirectoryHandle = useCallback((handle) => {
        setDirectoryHandle(handle);
    }, []);

    const handleFilesProcessed = useCallback(async (files) => {
        addLog({ message: '⚙️ Traitement des imports...', type: 'info' });

        try {
            // Parse all files
            const parsed = parseMultipleFiles(files);

            // Separate stdlib from third-party
            const stdlibImports = [];
            const thirdPartyImports = [];

            parsed.allImports.forEach(imp => {
                if (isStdlibModule(imp)) {
                    stdlibImports.push(imp);
                } else {
                    thirdPartyImports.push(imp);
                }
            });

            addLog({ message: `📦 ${thirdPartyImports.length} packages tiers détectés`, type: 'info' });
            addLog({ message: `📚 ${stdlibImports.length} modules stdlib ignorés`, type: 'default' });

            // Small delay for visual effect
            await new Promise(r => setTimeout(r, 500));

            setAnalysisData({
                files: parsed.files,
                stdlibImports,
                thirdPartyImports,
                totalFiles: Object.keys(parsed.files).length,
                totalImports: parsed.allImports.length,
            });

            addLog({ message: '🎉 Prêt ! Affichage des résultats...', type: 'success' });

            // Transition to results view
            await new Promise(r => setTimeout(r, 800));
            setView('results');

            showToast(`${Object.keys(parsed.files).length} fichiers analysés avec succès`, 'success');
        } catch (error) {
            console.error('Error processing files:', error);
            addLog({ message: `❌ Erreur: ${error.message}`, type: 'error' });
            showToast('Erreur lors de l\'analyse', 'error');

            setTimeout(() => {
                setView('upload');
            }, 2000);
        }
    }, [addLog, showToast]);

    // Reset to upload view
    const handleReset = useCallback(() => {
        setView('upload');
        setAnalysisData(null);
        setDirectoryHandle(null);
        setLogs([]);
    }, []);

    const isScanning = view === 'scanning';
    const hasResults = view === 'results' && analysisData;

    return (
        <div className="min-h-screen bg-cyber-bg cyber-grid relative overflow-hidden">
            {/* Header */}
            <Header />

            {/* Scan Terminal Overlay */}
            <ScanTerminal
                logs={logs}
                isScanning={isScanning}
                progress={scanProgress}
                totalFiles={totalFiles}
            />

            {/* Background Graph (when results exist) */}
            <AnimatePresence>
                {hasResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 pt-16"
                    >
                        <DependencyGraph
                            data={analysisData}
                            width={dimensions.width}
                            height={dimensions.height - 64}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="relative z-10 pt-24 px-6 min-h-screen flex flex-col">
                {/* Upload Section (visible when no results and not scanning) */}
                <AnimatePresence mode="wait">
                    {view === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex-1 flex flex-col items-center justify-center -mt-16"
                        >
                            {/* Hero Text */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-center mb-8"
                            >
                                <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-3">
                                    Analysez vos <span className="text-cta-primary neon-text">Dépendances</span>
                                </h2>
                                <p className="text-node-stdlib max-w-md mx-auto">
                                    Sélectionnez votre projet Python pour visualiser les imports et générer automatiquement requirements.txt
                                </p>
                            </motion.div>

                            {/* File Uploader */}
                            <FileUploader
                                onFilesProcessed={handleFilesProcessed}
                                onDirectoryHandle={handleDirectoryHandle}
                                onLog={addLog}
                                onScanStart={handleScanStart}
                                onScanEnd={handleScanEnd}
                                onProgress={handleProgress}
                                isProcessing={isScanning}
                            />

                            {/* Features */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center"
                            >
                                {[
                                    { label: 'Accès Direct', desc: 'Écriture dans le dossier' },
                                    { label: 'Filtre Intelligent', desc: 'Sépare la stdlib' },
                                    { label: 'Versions PyPI', desc: 'Auto-récupérées' },
                                ].map((feature, i) => (
                                    <div key={i} className="space-y-1">
                                        <p className="font-orbitron text-cyber-highlight text-sm">{feature.label}</p>
                                        <p className="text-xs text-node-stdlib">{feature.desc}</p>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}

                    {hasResults && (
                        <motion.div
                            key="results-header"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between mb-6"
                        >
                            {/* Stats */}
                            <div className="flex items-center gap-6">
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Fichiers</p>
                                    <p className="font-orbitron text-xl text-white">{analysisData.totalFiles}</p>
                                </div>
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Imports Totaux</p>
                                    <p className="font-orbitron text-xl text-white">{analysisData.totalImports}</p>
                                </div>
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Tiers</p>
                                    <p className="font-orbitron text-xl text-node-import">{analysisData.thirdPartyImports.length}</p>
                                </div>
                            </div>

                            {/* New Scan Button */}
                            <button
                                onClick={handleReset}
                                className="glass rounded-lg px-4 py-2 text-sm text-node-stdlib hover:text-white hover:border-node-file transition-colors"
                            >
                                Nouveau scan
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Results Panel */}
            <AnimatePresence>
                {hasResults && (
                    <ResultsPanel
                        thirdPartyImports={analysisData.thirdPartyImports}
                        isVisible={true}
                        directoryHandle={directoryHandle}
                        onToast={showToast}
                    />
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />

            {/* Ambient decorations */}
            <div className="fixed top-1/4 left-10 w-64 h-64 bg-node-file/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-node-import/10 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
}
