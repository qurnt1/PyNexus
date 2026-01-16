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
    const [view, setView] = useState('upload');
    const [analysisData, setAnalysisData] = useState(null);
    const [directoryHandle, setDirectoryHandle] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
    const [logs, setLogs] = useState([]);
    const [scanProgress, setScanProgress] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    useEffect(() => {
        if (toast.isVisible) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast.isVisible]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && view === 'scanning') {
                setView('upload');
                addLog({ message: '⚠️ Scan cancelled', type: 'error' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view]);

    const showToast = useCallback((message, type = 'success') => setToast({ message, type, isVisible: true }), []);
    const hideToast = useCallback(() => setToast(prev => ({ ...prev, isVisible: false })), []);
    const addLog = useCallback((log) => setLogs(prev => [...prev, log]), []);
    const handleScanStart = useCallback(() => { setLogs([]); setScanProgress(0); setTotalFiles(0); setView('scanning'); }, []);
    const handleScanEnd = useCallback((success) => { if (!success) setTimeout(() => setView('upload'), 2000); }, []);
    const handleProgress = useCallback((current, total) => { setScanProgress(current); setTotalFiles(total); }, []);
    const handleDirectoryHandle = useCallback((handle) => setDirectoryHandle(handle), []);

    const handleFilesProcessed = useCallback(async (files) => {
        addLog({ message: '⚙️ Processing imports...', type: 'info' });
        try {
            const parsed = parseMultipleFiles(files);
            const stdlibImports = [];
            const thirdPartyImports = [];
            parsed.allImports.forEach(imp => {
                if (isStdlibModule(imp)) stdlibImports.push(imp);
                else thirdPartyImports.push(imp);
            });
            addLog({ message: `📦 ${thirdPartyImports.length} third-party packages detected`, type: 'info' });
            addLog({ message: `📚 ${stdlibImports.length} stdlib modules ignored`, type: 'default' });
            setAnalysisData({
                files: parsed.files,
                stdlibImports,
                thirdPartyImports,
                totalFiles: Object.keys(parsed.files).length,
                totalImports: parsed.allImports.length,
            });
            addLog({ message: '🎉 Ready! Displaying results...', type: 'success' });
            await new Promise(r => setTimeout(r, 800));
            setView('results');
            showToast(`${Object.keys(parsed.files).length} files analyzed successfully`, 'success');
        } catch (error) {
            console.error('Error:', error);
            addLog({ message: `❌ Error: ${error.message}`, type: 'error' });
            showToast('Error during analysis', 'error');
            setTimeout(() => setView('upload'), 2000);
        }
    }, [addLog, showToast]);

    const handleReset = useCallback(() => { setView('upload'); setAnalysisData(null); setDirectoryHandle(null); setLogs([]); }, []);

    const isScanning = view === 'scanning';
    const hasResults = view === 'results' && analysisData && Object.keys(analysisData.files || {}).length > 0;

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div className="flex flex-col h-screen bg-cyber-bg cyber-grid overflow-hidden">
            {/* Fixed Header */}
            <Header />

            {/* Scan Terminal Overlay */}
            <ScanTerminal logs={logs} isScanning={isScanning} progress={scanProgress} totalFiles={totalFiles} />

            {/* Main Content Area - Takes remaining space */}
            <main className="flex-1 flex flex-col pt-20 relative overflow-hidden">

                {/* UPLOAD VIEW */}
                {view === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center px-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-8"
                        >
                            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-3">
                                Analyze your <span className="text-cta-primary neon-text">Dependencies</span>
                            </h2>
                            <p className="text-node-stdlib max-w-md mx-auto">
                                Select your Python project to visualize imports and auto-generate requirements.txt
                            </p>
                        </motion.div>

                        <FileUploader
                            onFilesProcessed={handleFilesProcessed}
                            onDirectoryHandle={handleDirectoryHandle}
                            onLog={addLog}
                            onScanStart={handleScanStart}
                            onScanEnd={handleScanEnd}
                            onProgress={handleProgress}
                            isProcessing={isScanning}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center"
                        >
                            {[
                                { label: 'Direct Access', desc: 'Write to folder' },
                                { label: 'Smart Filter', desc: 'Separates stdlib' },
                                { label: 'PyPI Versions', desc: 'Auto-fetched' }
                            ].map((f, i) => (
                                <div key={i} className="space-y-1">
                                    <p className="font-orbitron text-cyber-highlight text-sm">{f.label}</p>
                                    <p className="text-xs text-node-stdlib">{f.desc}</p>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* RESULTS VIEW - Graph takes full remaining space */}
                {hasResults && (
                    <>
                        {/* Graph Container - Full remaining space, receives all mouse events */}
                        <div className="flex-1 relative">
                            <DependencyGraph data={analysisData} />
                        </div>

                        {/* Results Header Overlay - pointer-events-none on container, auto on buttons */}
                        <div className="absolute top-24 left-6 z-20 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-4 pointer-events-auto"
                            >
                                <button
                                    onClick={handleReset}
                                    className="glass rounded-lg px-4 py-3 text-sm font-orbitron text-cta-primary hover:text-white hover:bg-cta-primary/20 border border-cta-primary/50 transition-all"
                                >
                                    ← New Scan
                                </button>
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Files</p>
                                    <p className="font-orbitron text-xl text-white">{analysisData.totalFiles}</p>
                                </div>
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Imports</p>
                                    <p className="font-orbitron text-xl text-white">{analysisData.totalImports}</p>
                                </div>
                                <div className="glass rounded-lg px-4 py-2">
                                    <p className="text-xs text-node-stdlib">Third-party</p>
                                    <p className="font-orbitron text-xl text-node-import">{analysisData.thirdPartyImports.length}</p>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}

                {/* ERROR STATE */}
                {view === 'results' && !hasResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center"
                    >
                        <p className="text-red-400 text-xl mb-4">No results to display</p>
                        <p className="text-node-stdlib mb-6">An error occurred or no valid Python files were found.</p>
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 bg-cta-primary text-cta-text font-orbitron font-semibold rounded-lg"
                        >
                            Go Back
                        </button>
                    </motion.div>
                )}
            </main>

            {/* Results Panel (fixed right sidebar) */}
            {hasResults && (
                <ResultsPanel
                    thirdPartyImports={analysisData.thirdPartyImports}
                    isVisible={true}
                    directoryHandle={directoryHandle}
                    onToast={showToast}
                />
            )}

            {/* Toast Notifications */}
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />

            {/* Decorative Background Blurs - pointer-events-none to not block graph */}
            <div className="fixed top-1/4 left-10 w-64 h-64 bg-node-file/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-node-import/10 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
}
