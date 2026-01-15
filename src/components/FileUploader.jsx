import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Upload, FileCode, Loader2, AlertCircle } from 'lucide-react';

const isFileSystemAccessSupported = () => 'showDirectoryPicker' in window;

export default function FileUploader({
    onFilesProcessed,
    onDirectoryHandle,
    onLog,
    onScanStart,
    onScanEnd,
    onProgress,
    isProcessing
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [error, setError] = useState(null);
    const fallbackInputRef = useRef(null);

    const readDirectoryRecursive = async (directoryHandle, basePath = '', allFiles = []) => {
        for await (const entry of directoryHandle.values()) {
            const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                if (entry.name.endsWith('.py') || entry.name.endsWith('.pyw')) {
                    allFiles.push({ entry, path: entryPath });
                }
            } else if (entry.kind === 'directory') {
                const skipDirs = ['__pycache__', '.git', 'node_modules', 'venv', '.venv', 'env', '.env', '.tox', '.pytest_cache', 'dist', 'build'];
                if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                    await readDirectoryRecursive(entry, entryPath, allFiles);
                }
            }
        }
        return allFiles;
    };

    const processFilesWithLogs = async (fileEntries) => {
        const pythonFiles = [];
        const totalFiles = fileEntries.length;

        onLog({ message: `📁 ${totalFiles} Python files detected`, type: 'info' });

        for (let i = 0; i < fileEntries.length; i++) {
            const { entry, path, file: existingFile } = fileEntries[i];
            try {
                let content, fileName;
                if (entry) {
                    const file = await entry.getFile();
                    content = await file.text();
                    fileName = path;
                } else if (existingFile) {
                    content = await existingFile.text();
                    fileName = path || existingFile.name;
                }
                if (content !== undefined) {
                    pythonFiles.push({ name: fileName, content });
                    onLog({ message: `🔍 Analyzing ${fileName.split('/').pop()}...`, type: 'default' });
                    onProgress(i + 1, totalFiles);
                }
            } catch (err) {
                onLog({ message: `❌ Error: ${path || 'unknown file'}`, type: 'error' });
            }
            await new Promise(r => setTimeout(r, 30));
        }
        return pythonFiles;
    };

    const handleSelectDirectory = useCallback(async () => {
        setError(null);
        if (!isFileSystemAccessSupported()) {
            fallbackInputRef.current?.click();
            return;
        }
        try {
            onLog({ message: '📂 Opening folder picker...', type: 'info' });
            const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setFolderName(directoryHandle.name);
            onDirectoryHandle(directoryHandle);
            onScanStart();
            onLog({ message: `📂 Reading folder "${directoryHandle.name}"...`, type: 'info' });
            const fileEntries = await readDirectoryRecursive(directoryHandle);
            if (fileEntries.length === 0) {
                onLog({ message: '⚠️ No Python files found in this folder.', type: 'error' });
                setError('No Python files found.');
                onScanEnd(false);
                return;
            }
            const pythonFiles = await processFilesWithLogs(fileEntries);
            if (pythonFiles.length > 0) {
                onLog({ message: `✅ Analysis complete: ${pythonFiles.length} files processed`, type: 'success' });
                onFilesProcessed(pythonFiles);
                onScanEnd(true);
            } else {
                onScanEnd(false);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                onLog({ message: '⚠️ Selection cancelled', type: 'default' });
                onScanEnd(false);
                return;
            }
            onLog({ message: `❌ Error: ${err.message}`, type: 'error' });
            setError('Error selecting folder.');
            onScanEnd(false);
        }
    }, [onFilesProcessed, onDirectoryHandle, onLog, onScanStart, onScanEnd, onProgress]);

    const handleFallbackInput = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        onScanStart();
        onLog({ message: '📂 Compatibility mode (Firefox/Safari)', type: 'info' });
        const firstPath = files[0].webkitRelativePath || '';
        setFolderName(firstPath.split('/')[0] || 'Folder');
        const pythonFileList = files.filter(f => f.name.endsWith('.py') || f.name.endsWith('.pyw'));
        if (pythonFileList.length === 0) {
            onLog({ message: '⚠️ No Python files found.', type: 'error' });
            setError('No Python files found.');
            onScanEnd(false);
            return;
        }
        const fileEntries = pythonFileList.map(f => ({ file: f, path: f.webkitRelativePath || f.name, entry: null }));
        const pythonFiles = await processFilesWithLogs(fileEntries);
        if (pythonFiles.length > 0) {
            onLog({ message: `✅ Analysis complete: ${pythonFiles.length} files processed`, type: 'success' });
            onFilesProcessed(pythonFiles);
            onScanEnd(true);
        } else {
            onScanEnd(false);
        }
        e.target.value = '';
    }, [onFilesProcessed, onLog, onScanStart, onScanEnd, onProgress]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="w-full max-w-md mx-auto">
            <input ref={fallbackInputRef} type="file" webkitdirectory="" directory="" multiple onChange={handleFallbackInput} className="hidden" disabled={isProcessing} />
            <button
                onClick={handleSelectDirectory}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleSelectDirectory(); }}
                disabled={isProcessing}
                className={`relative block w-full cursor-pointer text-left border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${isDragOver ? 'border-cta-primary bg-cta-primary/10 scale-[1.02]' : 'border-cyber-border hover:border-node-file hover:bg-node-file/5'} ${isProcessing ? 'pointer-events-none opacity-70' : ''}`}
            >
                <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatePresence mode="wait">
                        {isProcessing ? (
                            <motion.div key="loading" initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}>
                                <Loader2 className="w-12 h-12 text-cta-primary" />
                            </motion.div>
                        ) : isDragOver ? (
                            <motion.div key="drop" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative">
                                <Upload className="w-12 h-12 text-cta-primary" />
                            </motion.div>
                        ) : (
                            <motion.div key="folder" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                <FolderOpen className="w-12 h-12 text-node-file" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div>
                        <p className="font-orbitron text-white font-medium mb-1">{isProcessing ? 'Analyzing...' : 'Select Python Project'}</p>
                        <p className="text-sm text-node-stdlib">{isDragOver ? 'Release to analyze' : 'Click to open folder picker'}</p>
                    </div>
                    {folderName && !isProcessing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-cyber-highlight">
                            <FileCode className="w-4 h-4" />
                            <span>Folder: <strong>{folderName}</strong></span>
                        </motion.div>
                    )}
                    {error && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </div>
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyber-border" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyber-border" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyber-border" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyber-border" />
            </button>
            {!isFileSystemAccessSupported() && (
                <p className="mt-3 text-xs text-node-stdlib/70 text-center">💡 Compatibility mode (classic download)</p>
            )}
        </motion.div>
    );
}
