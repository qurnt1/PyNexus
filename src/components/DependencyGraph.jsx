import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import { ExternalLink, Search, X, Lock, Unlock, Focus } from "lucide-react";

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const NODE_COLORS = {
    file: "#2D7DFF",
    thirdParty: "#7C3AED",
    stdlib: "#7F8AB8",
};

const PYTHON_ICON_URL = "https://cdn-icons-png.flaticon.com/512/5968/5968350.png";

const buildStdlibDocUrl = (importName) => {
    const root = String(importName || "").split(".")[0];
    if (!root) return null;
    return `https://docs.python.org/3/library/${root}.html`;
};

const buildPyPiUrl = (rootName) => {
    const root = String(rootName || "").trim();
    if (!root) return null;
    return `https://pypi.org/project/${root}/`;
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function DependencyGraph({ data }) {
    const graphRef = useRef();
    const containerRef = useRef();

    // State
    const [hoveredNode, setHoveredNode] = useState(null);
    const [lockedNode, setLockedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Pre-loaded Python icon for canvas rendering
    const [pythonIcon, setPythonIcon] = useState(null);

    // Active node = locked takes priority over hovered
    const activeNode = lockedNode || hoveredNode;

    // -------------------------------------------------------------------------
    // Pre-load Python Icon (outside render loop to avoid lag)
    // -------------------------------------------------------------------------
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = PYTHON_ICON_URL;
        img.onload = () => setPythonIcon(img);
    }, []);

    // -------------------------------------------------------------------------
    // ResizeObserver - Tracks container size accurately
    // -------------------------------------------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        resizeObserver.observe(container);

        // Initial measurement
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setDimensions({ width: rect.width, height: rect.height });
        }

        return () => resizeObserver.disconnect();
    }, []);

    // -------------------------------------------------------------------------
    // Build Graph Data
    // -------------------------------------------------------------------------
    const graphData = useMemo(() => {
        if (!data || !data.files) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        // File nodes
        Object.keys(data.files).forEach((fileName) => {
            const id = `file:${fileName}`;
            if (!nodeIds.has(id)) {
                nodes.push({
                    id,
                    name: fileName.split("/").pop(),
                    fullName: fileName,
                    type: "file",
                    val: 12,
                });
                nodeIds.add(id);
            }
        });

        // Import nodes + links
        Object.entries(data.files).forEach(([fileName, imports]) => {
            const fileId = `file:${fileName}`;
            if (!Array.isArray(imports)) return;

            imports.forEach((imp) => {
                const importName = String(imp || "").trim();
                if (!importName) return;

                const rootName = importName.split(".")[0];

                const isStdlib =
                    (Array.isArray(data.stdlibImports) && data.stdlibImports.includes(importName)) ||
                    (Array.isArray(data.stdlibImports) && data.stdlibImports.includes(rootName));

                const type = isStdlib ? "stdlib" : "thirdParty";
                const impId = `import:${importName}`;

                if (!nodeIds.has(impId)) {
                    const pythonUrl = isStdlib ? buildStdlibDocUrl(importName) : null;
                    const pypiUrl = !isStdlib ? buildPyPiUrl(rootName) : null;

                    nodes.push({
                        id: impId,
                        name: rootName,
                        fullName: importName,
                        importName,
                        rootName,
                        type,
                        isNative: isStdlib,
                        pythonUrl,
                        pypiUrl,
                        docUrl: isStdlib ? pythonUrl : pypiUrl,
                        val: isStdlib ? 8 : 10,
                    });
                    nodeIds.add(impId);
                }

                links.push({ source: fileId, target: impId });
            });
        });

        return { nodes, links };
    }, [data]);

    // -------------------------------------------------------------------------
    // Highlighting Logic
    // -------------------------------------------------------------------------
    const highlightNodes = useMemo(() => {
        if (!activeNode) return new Set();

        const neighbors = new Set([activeNode.id]);
        graphData.links.forEach((link) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            if (sourceId === activeNode.id) neighbors.add(targetId);
            if (targetId === activeNode.id) neighbors.add(sourceId);
        });
        return neighbors;
    }, [activeNode, graphData.links]);

    const highlightLinks = useMemo(() => {
        if (!activeNode) return new Set();

        const linkSet = new Set();
        graphData.links.forEach((link) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            if (sourceId === activeNode.id || targetId === activeNode.id) {
                linkSet.add(`${sourceId}->${targetId}`);
            }
        });
        return linkSet;
    }, [activeNode, graphData.links]);

    // -------------------------------------------------------------------------
    // Search Results
    // -------------------------------------------------------------------------
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return graphData.nodes
            .filter((n) => n.name.toLowerCase().includes(query) || n.fullName.toLowerCase().includes(query))
            .slice(0, 8);
    }, [searchQuery, graphData.nodes]);

    // -------------------------------------------------------------------------
    // Custom Canvas Node Painting
    // -------------------------------------------------------------------------
    const paintNode = useCallback(
        (node, ctx, globalScale) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

            const size = node.val || 10;
            const color = NODE_COLORS[node.type] || NODE_COLORS.thirdParty;
            const label = globalScale > 2.2 ? (node.fullName ?? node.name) : node.name;
            const fontSize = Math.max(12 / globalScale, 4);

            // Focus mode: dim non-connected nodes
            const isFocused = !activeNode || highlightNodes.has(node.id);
            const opacity = isFocused ? 1 : 0.15;

            ctx.globalAlpha = opacity;

            // -----------------------------------------------------------------
            // Draw Node Based on Type
            // -----------------------------------------------------------------
            if (node.type === "file" && pythonIcon) {
                // Python icon for file nodes
                const iconSize = size * 2.2;
                ctx.drawImage(
                    pythonIcon,
                    node.x - iconSize / 2,
                    node.y - iconSize / 2,
                    iconSize,
                    iconSize
                );

                // Selection ring
                if (activeNode && node.id === activeNode.id) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, iconSize / 2 + 4, 0, 2 * Math.PI);
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                }
            } else {
                // Circles with glow effect for stdlib/thirdParty

                // Outer glow (shadow effect)
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI);
                ctx.fillStyle = color + "30";
                ctx.fill();

                // Middle glow
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
                ctx.fillStyle = color + "50";
                ctx.fill();

                // Main circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();

                // Border (brighter if this is the active node)
                if (activeNode && node.id === activeNode.id) {
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.5;
                }
                ctx.stroke();
            }

            // -----------------------------------------------------------------
            // Draw Label Below Node
            // -----------------------------------------------------------------
            ctx.font = `500 ${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const textWidth = ctx.measureText(String(label || "")).width;
            const bgPadding = 3;
            const labelY = node.y + size + 6;

            // Label background
            ctx.fillStyle = "rgba(6, 6, 23, 0.9)";
            ctx.fillRect(
                node.x - textWidth / 2 - bgPadding,
                labelY,
                textWidth + bgPadding * 2,
                fontSize + bgPadding * 2
            );

            // Label text
            ctx.fillStyle = isFocused ? "#EAF0FF" : "#4a4a6a";
            ctx.fillText(String(label || ""), node.x, labelY + 2);

            ctx.globalAlpha = 1;
        },
        [activeNode, highlightNodes, pythonIcon]
    );

    // -------------------------------------------------------------------------
    // Link Color for Focus Mode
    // -------------------------------------------------------------------------
    const getLinkColor = useCallback(
        (link) => {
            if (!activeNode) return "#24265F";
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            const key = `${sourceId}->${targetId}`;
            return highlightLinks.has(key) ? "#7C3AED" : "rgba(36, 38, 95, 0.15)";
        },
        [activeNode, highlightLinks]
    );

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
    const handleNodeHover = useCallback((node) => {
        setHoveredNode(node || null);
    }, []);

    const handleNodeClick = useCallback(
        (node) => {
            if (lockedNode && lockedNode.id === node.id) {
                setLockedNode(null);
            } else {
                setLockedNode(node);
            }
        },
        [lockedNode]
    );

    const handleSearchSelect = useCallback((node) => {
        setSearchQuery("");
        setSearchFocused(false);
        setLockedNode(node);

        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 800);
            graphRef.current.zoom(4, 1000);
        }
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setLockedNode(null);
    }, []);

    const handleCenterView = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
        }
    }, []);

    // -------------------------------------------------------------------------
    // Empty State
    // -------------------------------------------------------------------------
    if (graphData.nodes.length === 0) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                <p className="text-node-stdlib text-lg">No dependencies to display</p>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: "none" }}
        >
            {/* Force Graph - Fills entire container */}
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="transparent"
                nodeCanvasObjectMode={() => "replace"}
                nodeCanvasObject={paintNode}
                linkColor={getLinkColor}
                linkWidth={(link) => {
                    if (!activeNode) return 1.5;
                    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                    const targetId = typeof link.target === "object" ? link.target.id : link.target;
                    const key = `${sourceId}->${targetId}`;
                    return highlightLinks.has(key) ? 2.5 : 0.5;
                }}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                enableNodeDrag={true}
                minZoom={0.5}
                maxZoom={12}
            />

            {/* Search Bar - Top Left (with pointer-events-auto) */}
            <div className="absolute top-4 left-4 z-20 pointer-events-auto">
                <div className="relative">
                    <div className="flex items-center gap-2 bg-cyber-bg/95 backdrop-blur-xl rounded-xl border border-cyber-border px-3 py-2.5 min-w-[260px] shadow-lg">
                        <Search className="w-4 h-4 text-node-stdlib" />
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                            className="bg-transparent text-[#EAF0FF] text-sm placeholder-node-stdlib outline-none flex-1 font-mono"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-node-stdlib hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {searchFocused && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-cyber-bg/98 backdrop-blur-xl rounded-xl border border-cyber-border overflow-hidden shadow-xl"
                            >
                                {searchResults.map((node) => (
                                    <button
                                        key={node.id}
                                        onMouseDown={() => handleSearchSelect(node)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: NODE_COLORS[node.type],
                                                boxShadow: `0 0 8px ${NODE_COLORS[node.type]}`,
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[#EAF0FF] text-sm truncate">{node.name}</p>
                                            <p className="text-node-stdlib text-xs truncate">{node.fullName}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Center View Button - Top Right (before Inspector) */}
            <button
                onClick={handleCenterView}
                className="absolute top-4 right-[310px] z-20 pointer-events-auto bg-cyber-bg/95 backdrop-blur-xl rounded-xl border border-cyber-border p-2.5 hover:bg-cyber-panel hover:border-node-file transition-all shadow-lg group"
                title="Center View"
            >
                <Focus className="w-5 h-5 text-node-stdlib group-hover:text-node-file transition-colors" />
            </button>

            {/* Inspector Panel - Top Right */}
            <motion.div layout className="absolute top-4 right-4 z-20 w-72 pointer-events-auto">
                <div
                    className="bg-cyber-bg/95 backdrop-blur-xl rounded-xl border-2 overflow-hidden shadow-2xl"
                    style={{
                        borderColor: activeNode ? NODE_COLORS[activeNode.type] : "#24265F",
                        boxShadow: activeNode ? `0 0 30px ${NODE_COLORS[activeNode.type]}30` : "none",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border/50">
                        <span className="text-xs text-node-stdlib font-orbitron uppercase tracking-wider">
                            Inspector
                        </span>
                        {lockedNode ? (
                            <button
                                onClick={() => setLockedNode(null)}
                                className="text-cyber-highlight hover:text-white transition-colors"
                            >
                                <Lock className="w-4 h-4" />
                            </button>
                        ) : (
                            <Unlock className="w-4 h-4 text-cyber-border" />
                        )}
                    </div>

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        {activeNode ? (
                            <motion.div
                                key={activeNode.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="p-4 space-y-3"
                            >
                                {/* Node Name */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{
                                            backgroundColor: NODE_COLORS[activeNode.type],
                                            boxShadow: `0 0 12px ${NODE_COLORS[activeNode.type]}`,
                                        }}
                                    />
                                    <span className="text-[#EAF0FF] font-orbitron font-semibold text-lg truncate">
                                        {activeNode.name}
                                    </span>
                                </div>

                                {/* Type Badge */}
                                <div>
                                    {activeNode.type === "thirdParty" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-node-import/20 text-node-import text-xs rounded-lg border border-node-import/30">
                                            📦 Third-Party (PyPI)
                                        </span>
                                    )}
                                    {activeNode.type === "stdlib" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-node-stdlib/20 text-node-stdlib text-xs rounded-lg border border-node-stdlib/30">
                                            🐍 Standard Library
                                        </span>
                                    )}
                                    {activeNode.type === "file" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-node-file/20 text-node-file text-xs rounded-lg border border-node-file/30">
                                            📄 Source File
                                        </span>
                                    )}
                                </div>

                                {/* Details */}
                                {activeNode.type === "file" && activeNode.fullName !== activeNode.name && (
                                    <p
                                        className="text-xs text-node-stdlib font-mono bg-black/30 px-2 py-1.5 rounded-lg truncate"
                                        title={activeNode.fullName}
                                    >
                                        {activeNode.fullName}
                                    </p>
                                )}

                                {activeNode.type !== "file" && (
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-node-stdlib">Import:</span>
                                            <span className="text-[#EAF0FF] font-mono">
                                                {activeNode.importName || activeNode.fullName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-node-stdlib">Native:</span>
                                            <span className={activeNode.isNative ? "text-emerald-400" : "text-rose-400"}>
                                                {activeNode.isNative ? "Yes" : "No"}
                                            </span>
                                        </div>
                                        {!activeNode.isNative && (
                                            <div className="flex justify-between">
                                                <span className="text-node-stdlib">Package:</span>
                                                <span className="text-[#EAF0FF] font-mono">{activeNode.rootName}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Links (only when locked) */}
                                {lockedNode && activeNode.type !== "file" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="pt-3 space-y-2 border-t border-cyber-border/50"
                                    >
                                        {activeNode.pythonUrl && (
                                            <a
                                                href={activeNode.pythonUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2.5 bg-cyber-highlight/10 hover:bg-cyber-highlight/20 text-cyber-highlight rounded-lg text-xs transition-colors border border-cyber-highlight/30"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="font-medium">Python Docs</span>
                                            </a>
                                        )}
                                        {activeNode.pypiUrl && (
                                            <a
                                                href={activeNode.pypiUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2.5 bg-node-import/10 hover:bg-node-import/20 text-node-import rounded-lg text-xs transition-colors border border-node-import/30"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="font-medium">View on PyPI</span>
                                            </a>
                                        )}
                                    </motion.div>
                                )}

                                {!lockedNode && (
                                    <p className="text-[10px] text-node-stdlib text-center pt-1">
                                        Click node to lock & show links
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-6 text-center"
                            >
                                <p className="text-node-stdlib text-sm">Hover over a node</p>
                                <p className="text-cyber-border text-xs mt-1">to see details</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Legend - Bottom Left */}
            <div className="absolute bottom-4 left-4 bg-cyber-bg/95 backdrop-blur-xl rounded-xl p-3 text-xs space-y-2 z-10 border border-cyber-border shadow-lg pointer-events-auto">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: NODE_COLORS.file,
                            boxShadow: `0 0 6px ${NODE_COLORS.file}`,
                        }}
                    />
                    <span className="text-node-stdlib">Python Files</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: NODE_COLORS.thirdParty,
                            boxShadow: `0 0 6px ${NODE_COLORS.thirdParty}`,
                        }}
                    />
                    <span className="text-node-stdlib">Third-Party</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: NODE_COLORS.stdlib,
                            boxShadow: `0 0 6px ${NODE_COLORS.stdlib}`,
                        }}
                    />
                    <span className="text-node-stdlib">Stdlib</span>
                </div>
            </div>

            {/* Controls Hint - Bottom Right */}
            <div className="absolute bottom-4 right-4 bg-cyber-bg/95 backdrop-blur-xl rounded-xl px-4 py-2.5 text-[11px] text-node-stdlib z-10 border border-cyber-border shadow-lg pointer-events-auto">
                <span className="text-cyber-highlight">Scroll</span> to zoom •{" "}
                <span className="text-cyber-highlight">Drag</span> to pan •{" "}
                <span className="text-cyber-highlight">Click</span> to lock
            </div>
        </div>
    );
}
