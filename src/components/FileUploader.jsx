import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Upload, FileCode, Loader2, AlertCircle } from 'lucide-react';

// Check if File System Access API is supported
const isFileSystemAccessSupported = () => {
    return 'showDirectoryPicker' in window;
};

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

    /**
     * Recursively read all Python files from a directory handle
     */
    const readDirectoryRecursive = async (directoryHandle, basePath = '', allFiles = []) => {
        for await (const entry of directoryHandle.values()) {
            const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

            if (entry.kind === 'file') {
                if (entry.name.endsWith('.py') || entry.name.endsWith('.pyw')) {
                    allFiles.push({ entry, path: entryPath });
                }
            } else if (entry.kind === 'directory') {
                // Skip common non-source directories
                const skipDirs = ['__pycache__', '.git', 'node_modules', 'venv', '.venv', 'env', '.env', '.tox', '.pytest_cache', 'dist', 'build', '.eggs'];
                if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                    await readDirectoryRecursive(entry, entryPath, allFiles);
                }
            }
        }
        return allFiles;
    };

    /**
     * Process files with logging
     */
    const processFilesWithLogs = async (fileEntries, directoryHandle = null) => {
        const pythonFiles = [];
        const totalFiles = fileEntries.length;

        onLog({ message: `📁 ${totalFiles} fichiers Python détectés`, type: 'info' });

        for (let i = 0; i < fileEntries.length; i++) {
            const { entry, path, file: existingFile } = fileEntries[i];

            try {
                let content;
                let fileName;

                if (entry) {
                    // File System Access API
                    const file = await entry.getFile();
                    content = await file.text();
                    fileName = path;
                } else if (existingFile) {
                    // Fallback FileList
                    content = await existingFile.text();
                    fileName = path || existingFile.name;
                }

                if (content !== undefined) {
                    pythonFiles.push({ name: fileName, content });
                    onLog({ message: `🔍 Analyse de ${fileName.split('/').pop()}...`, type: 'default' });
                    onProgress(i + 1, totalFiles);
                }
            } catch (err) {
                onLog({ message: `❌ Erreur: ${path || 'fichier inconnu'}`, type: 'error' });
                console.error(err);
            }

            // Small delay for visual effect
            await new Promise(r => setTimeout(r, 30));
        }

        return pythonFiles;
    };

    /**
     * Handle directory selection via File System Access API
     */
    const handleSelectDirectory = useCallback(async () => {
        setError(null);

        // Check for API support
        if (!isFileSystemAccessSupported()) {
            // Trigger fallback input
            if (fallbackInputRef.current) {
                fallbackInputRef.current.click();
            }
            return;
        }

        try {
            onLog({ message: '📂 Ouverture du sélecteur de dossier...', type: 'info' });

            // Open directory picker
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
            });

            setFolderName(directoryHandle.name);
            onDirectoryHandle(directoryHandle);

            onScanStart();
            onLog({ message: `📂 Lecture du dossier "${directoryHandle.name}"...`, type: 'info' });

            // Get all file entries first
            const fileEntries = await readDirectoryRecursive(directoryHandle);

            if (fileEntries.length === 0) {
                onLog({ message: '⚠️ Aucun fichier Python trouvé dans ce dossier.', type: 'error' });
                setError('Aucun fichier Python trouvé.');
                onScanEnd(false);
                return;
            }

            // Process files with logging
            const pythonFiles = await processFilesWithLogs(fileEntries, directoryHandle);

            if (pythonFiles.length > 0) {
                onLog({ message: `✅ Analyse terminée: ${pythonFiles.length} fichiers traités`, type: 'success' });
                onFilesProcessed(pythonFiles);
                onScanEnd(true);
            } else {
                onScanEnd(false);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                onLog({ message: '⚠️ Sélection annulée par l\'utilisateur', type: 'default' });
                onScanEnd(false);
                return;
            }
            console.error('Error selecting directory:', err);
            onLog({ message: `❌ Erreur: ${err.message}`, type: 'error' });
            setError('Erreur lors de la sélection du dossier.');
            onScanEnd(false);
        }
    }, [onFilesProcessed, onDirectoryHandle, onLog, onScanStart, onScanEnd, onProgress]);

    /**
     * Fallback: Handle files via traditional input (Firefox/Safari)
     */
    const handleFallbackInput = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) return;

        onScanStart();
        onLog({ message: '📂 Mode compatibilité (Firefox/Safari)', type: 'info' });

        // Get folder name from first file path
        const firstPath = files[0].webkitRelativePath || '';
        const folderName = firstPath.split('/')[0] || 'Dossier';
        setFolderName(folderName);

        // Filter Python files
        const pythonFileList = files.filter(f =>
            f.name.endsWith('.py') || f.name.endsWith('.pyw')
        );

        if (pythonFileList.length === 0) {
            onLog({ message: '⚠️ Aucun fichier Python trouvé.', type: 'error' });
            setError('Aucun fichier Python trouvé.');
            onScanEnd(false);
            return;
        }

        // Convert to our format
        const fileEntries = pythonFileList.map(f => ({
            file: f,
            path: f.webkitRelativePath || f.name,
            entry: null,
        }));

        // Process files
        const pythonFiles = await processFilesWithLogs(fileEntries);

        if (pythonFiles.length > 0) {
            onLog({ message: `✅ Analyse terminée: ${pythonFiles.length} fichiers traités`, type: 'success' });
            onFilesProcessed(pythonFiles);
            onScanEnd(true);
        } else {
            onScanEnd(false);
        }

        // Clear input for re-selection
        e.target.value = '';
    }, [onFilesProcessed, onLog, onScanStart, onScanEnd, onProgress]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleSelectDirectory();
    }, [handleSelectDirectory]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-md mx-auto"
        >
            {/* Hidden fallback input for Firefox/Safari */}
            <input
                ref={fallbackInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFallbackInput}
                className="hidden"
                disabled={isProcessing}
            />

            {/* Main clickable area */}
            <button
                onClick={handleSelectDirectory}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={isProcessing}
                className={`
          relative block w-full cursor-pointer text-left
          border-2 border-dashed rounded-xl p-8
          transition-all duration-300 ease-out
          ${isDragOver
                        ? 'border-cta-primary bg-cta-primary/10 scale-[1.02]'
                        : 'border-cyber-border hover:border-node-file hover:bg-node-file/5'
                    }
          ${isProcessing ? 'pointer-events-none opacity-70' : ''}
        `}
            >
                <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatePresence mode="wait">
                        {isProcessing ? (
                            <motion.div
                                key="loading"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: 360 }}
                                exit={{ scale: 0 }}
                                transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
                            >
                                <Loader2 className="w-12 h-12 text-cta-primary" />
                            </motion.div>
                        ) : isDragOver ? (
                            <motion.div
                                key="drop"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="relative"
                            >
                                <Upload className="w-12 h-12 text-cta-primary" />
                                <motion.div
                                    className="absolute inset-0 bg-cta-primary rounded-full opacity-30 blur-lg"
                                    animate={{ scale: [1, 1.5, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="folder"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="relative"
                            >
                                <FolderOpen className="w-12 h-12 text-node-file" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <p className="font-orbitron text-white font-medium mb-1">
                            {isProcessing ? 'Analyse en cours...' : 'Sélectionner un Projet Python'}
                        </p>
                        <p className="text-sm text-node-stdlib">
                            {isDragOver
                                ? 'Relâchez pour analyser'
                                : isFileSystemAccessSupported()
                                    ? 'Cliquez pour ouvrir le sélecteur'
                                    : 'Cliquez pour sélectionner un dossier'
                            }
                        </p>
                    </div>

                    {folderName && !isProcessing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-sm text-cyber-highlight"
                        >
                            <FileCode className="w-4 h-4" />
                            <span>Dossier: <strong>{folderName}</strong></span>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-sm text-red-400"
                        >
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </div>

                {/* Corner decorations */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyber-border" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyber-border" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyber-border" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyber-border" />
            </button>

            {/* Browser compatibility notice */}
            {!isFileSystemAccessSupported() && (
                <p className="mt-3 text-xs text-node-stdlib/70 text-center">
                    💡 Mode compatibilité Firefox/Safari (téléchargement classique)
                </p>
            )}
        </motion.div>
    );
}
