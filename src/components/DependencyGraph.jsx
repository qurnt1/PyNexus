import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import { ExternalLink, Search, X, Lock, Unlock } from "lucide-react";

const NODE_COLORS = {
    file: "#2D7DFF",
    thirdParty: "#7C3AED",
    stdlib: "#7F8AB8",
};

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

export default function DependencyGraph({ data, width, height }) {
    const graphRef = useRef();
    const containerRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [lockedNode, setLockedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    // Active node = locked takes priority over hovered
    const activeNode = lockedNode || hoveredNode;

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setContainerSize({ width: rect.width, height: rect.height });
                }
            }
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    const graphWidth = width && width > 0 ? width : containerSize.width;
    const graphHeight = height && height > 0 ? height : containerSize.height;

    const graphData = useMemo(() => {
        if (!data || !data.files) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        // Files nodes
        Object.keys(data.files).forEach((fileName) => {
            const id = `file:${fileName}`;
            if (!nodeIds.has(id)) {
                nodes.push({
                    id,
                    name: fileName.split("/").pop(),
                    fullName: fileName,
                    type: "file",
                    val: 10,
                });
                nodeIds.add(id);
            }
        });

        // Imports nodes + links
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
                        val: isStdlib ? 6 : 8,
                    });
                    nodeIds.add(impId);
                }

                links.push({ source: fileId, target: impId });
            });
        });

        return { nodes, links };
    }, [data]);

    // Compute highlighted nodes (connected to active node)
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

    // Compute highlighted links
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

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return graphData.nodes
            .filter((n) => n.name.toLowerCase().includes(query) || n.fullName.toLowerCase().includes(query))
            .slice(0, 8);
    }, [searchQuery, graphData.nodes]);

    // Custom node painting with labels and focus mode
    const paintNode = useCallback(
        (node, ctx, globalScale) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

            const size = node.val || 8;
            const color = NODE_COLORS[node.type] || NODE_COLORS.thirdParty;
            const label = globalScale > 2.2 ? (node.fullName ?? node.name) : node.name;
            const fontSize = Math.max(12 / globalScale, 4);

            // Focus mode: dim non-connected nodes
            const isFocused = !activeNode || highlightNodes.has(node.id);
            const opacity = isFocused ? 1 : 0.12;

            ctx.globalAlpha = opacity;

            // Outer glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
            ctx.fillStyle = color + "25";
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

            // Label below the node
            ctx.font = `500 ${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const textWidth = ctx.measureText(String(label || "")).width;
            const bgPadding = 3;

            ctx.fillStyle = "rgba(6, 6, 23, 0.85)";
            ctx.fillRect(
                node.x - textWidth / 2 - bgPadding,
                node.y + size + 4,
                textWidth + bgPadding * 2,
                fontSize + bgPadding * 2
            );

            ctx.fillStyle = isFocused ? "#e2e8f0" : "#4a4a6a";
            ctx.fillText(String(label || ""), node.x, node.y + size + 6);

            ctx.globalAlpha = 1;
        },
        [activeNode, highlightNodes]
    );

    // Custom link color for focus mode
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

    // Handle node hover
    const handleNodeHover = useCallback((node) => {
        setHoveredNode(node || null);
    }, []);

    // Handle node click (lock/unlock)
    const handleNodeClick = useCallback(
        (node) => {
            if (lockedNode && lockedNode.id === node.id) {
                // Unlock if clicking same node
                setLockedNode(null);
            } else {
                // Lock to this node
                setLockedNode(node);
            }
        },
        [lockedNode]
    );

    // Search: center and zoom on node
    const handleSearchSelect = useCallback((node) => {
        setSearchQuery("");
        setSearchFocused(false);
        setLockedNode(node);

        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 1000);
            graphRef.current.zoom(4, 1500);
        }
    }, []);

    // Click outside to unlock
    const handleBackgroundClick = useCallback(() => {
        setLockedNode(null);
    }, []);

    if (graphData.nodes.length === 0) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                <p className="text-node-stdlib text-lg">No dependencies to display</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full h-full flex-1">
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={graphWidth}
                height={graphHeight}
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
            />

            {/* Search Bar - Top Left */}
            <div className="absolute top-4 left-4 z-20">
                <div className="relative">
                    <div className="flex items-center gap-2 bg-[#0a0a1a]/90 backdrop-blur-md rounded-lg border border-gray-700 px-3 py-2 min-w-[240px]">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                            className="bg-transparent text-white text-sm placeholder-gray-500 outline-none flex-1 font-mono"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-gray-500 hover:text-white">
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
                                className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a1a]/95 backdrop-blur-md rounded-lg border border-gray-700 overflow-hidden"
                            >
                                {searchResults.map((node) => (
                                    <button
                                        key={node.id}
                                        onMouseDown={() => handleSearchSelect(node)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: NODE_COLORS[node.type] }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate">{node.name}</p>
                                            <p className="text-gray-500 text-xs truncate">{node.fullName}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inspector Panel - Bottom Right */}
            <motion.div
                layout
                className="absolute bottom-4 right-4 z-20 w-72"
            >
                <div
                    className="bg-[#0a0a1a]/90 backdrop-blur-xl rounded-xl border-2 overflow-hidden shadow-2xl"
                    style={{
                        borderColor: activeNode ? NODE_COLORS[activeNode.type] : "#333",
                        boxShadow: activeNode ? `0 0 30px ${NODE_COLORS[activeNode.type]}30` : "none",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <span className="text-xs text-gray-400 font-orbitron uppercase tracking-wider">Inspector</span>
                        {lockedNode ? (
                            <button onClick={() => setLockedNode(null)} className="text-cyan-400 hover:text-cyan-300">
                                <Lock className="w-4 h-4" />
                            </button>
                        ) : (
                            <Unlock className="w-4 h-4 text-gray-600" />
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
                                    <span className="text-white font-orbitron font-semibold text-lg truncate">
                                        {activeNode.name}
                                    </span>
                                </div>

                                {/* Type Badge */}
                                <div>
                                    {activeNode.type === "thirdParty" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-400 text-xs rounded-lg border border-violet-500/30">
                                            📦 Third-Party (PyPI)
                                        </span>
                                    )}
                                    {activeNode.type === "stdlib" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 text-gray-400 text-xs rounded-lg border border-gray-500/30">
                                            🐍 Standard Library
                                        </span>
                                    )}
                                    {activeNode.type === "file" && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs rounded-lg border border-blue-500/30">
                                            📄 Source File
                                        </span>
                                    )}
                                </div>

                                {/* Details */}
                                {activeNode.type === "file" && activeNode.fullName !== activeNode.name && (
                                    <p className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-1 rounded truncate" title={activeNode.fullName}>
                                        {activeNode.fullName}
                                    </p>
                                )}

                                {activeNode.type !== "file" && (
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Import:</span>
                                            <span className="text-gray-300 font-mono">{activeNode.importName || activeNode.fullName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Native:</span>
                                            <span className={activeNode.isNative ? "text-emerald-400" : "text-rose-400"}>
                                                {activeNode.isNative ? "Yes" : "No"}
                                            </span>
                                        </div>
                                        {!activeNode.isNative && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Package:</span>
                                                <span className="text-gray-300 font-mono">{activeNode.rootName}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Links (only when locked) */}
                                {lockedNode && activeNode.type !== "file" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="pt-2 space-y-2 border-t border-gray-700/50"
                                    >
                                        {activeNode.pythonUrl && (
                                            <a
                                                href={activeNode.pythonUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs transition-colors border border-cyan-500/30"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="font-medium">Python Docs</span>
                                            </a>
                                        )}
                                        {activeNode.pypiUrl && (
                                            <a
                                                href={activeNode.pypiUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-xs transition-colors border border-violet-500/30"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="font-medium">View on PyPI</span>
                                            </a>
                                        )}
                                    </motion.div>
                                )}

                                {!lockedNode && (
                                    <p className="text-[10px] text-gray-500 text-center pt-1">
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
                                <p className="text-gray-500 text-sm">Hover over a node</p>
                                <p className="text-gray-600 text-xs mt-1">to inspect details</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Legend - Bottom Left */}
            <div className="absolute bottom-4 left-4 bg-[#0a0a1a]/90 backdrop-blur rounded-lg p-3 text-xs space-y-2 z-10 border border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.file }} />
                    <span className="text-gray-400">Python Files</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.thirdParty }} />
                    <span className="text-gray-400">Third-Party</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.stdlib }} />
                    <span className="text-gray-400">Stdlib</span>
                </div>
            </div>

            {/* Controls hint */}
            <div className="absolute top-4 right-4 bg-[#0a0a1a]/90 backdrop-blur rounded-lg px-3 py-2 text-[10px] text-gray-500 z-10 border border-gray-700">
                Scroll to zoom • Drag to pan • Click to lock
            </div>
        </div>
    );
}
