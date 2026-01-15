import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import { ExternalLink } from 'lucide-react';

const NODE_COLORS = {
    file: '#2D7DFF',
    thirdParty: '#7C3AED',
    stdlib: '#7F8AB8',
};

export default function DependencyGraph({ data, width, height }) {
    const graphRef = useRef();
    const containerRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

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
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Track mouse position globally
    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, []);

    const graphWidth = width && width > 0 ? width : containerSize.width;
    const graphHeight = height && height > 0 ? height : containerSize.height;

    const graphData = useMemo(() => {
        if (!data || !data.files) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        Object.keys(data.files).forEach((fileName) => {
            const id = `file:${fileName}`;
            if (!nodeIds.has(id)) {
                nodes.push({
                    id,
                    name: fileName.split('/').pop(),
                    fullName: fileName,
                    type: 'file',
                    val: 10,
                });
                nodeIds.add(id);
            }
        });

        Object.entries(data.files).forEach(([fileName, imports]) => {
            const fileId = `file:${fileName}`;
            if (Array.isArray(imports)) {
                imports.forEach(imp => {
                    const isStdlib = data.stdlibImports?.includes(imp);
                    const type = isStdlib ? 'stdlib' : 'thirdParty';
                    const impId = `import:${imp}`;
                    if (!nodeIds.has(impId)) {
                        nodes.push({
                            id: impId,
                            name: imp,
                            fullName: imp,
                            type,
                            val: isStdlib ? 6 : 8,
                        });
                        nodeIds.add(impId);
                    }
                    links.push({ source: fileId, target: impId });
                });
            }
        });

        return { nodes, links };
    }, [data]);

    // Custom node painting with labels
    const paintNode = useCallback((node, ctx, globalScale) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

        const size = node.val || 8;
        const color = NODE_COLORS[node.type] || NODE_COLORS.thirdParty;
        const label = node.name;
        const fontSize = Math.max(12 / globalScale, 4);

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color + '25';
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label below the node
        ctx.font = `500 ${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const textWidth = ctx.measureText(label).width;
        const bgPadding = 3;
        ctx.fillStyle = 'rgba(6, 6, 23, 0.85)';
        ctx.fillRect(
            node.x - textWidth / 2 - bgPadding,
            node.y + size + 4,
            textWidth + bgPadding * 2,
            fontSize + bgPadding * 2
        );

        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(label, node.x, node.y + size + 6);
    }, []);

    // Handle node hover
    const handleNodeHover = useCallback((node) => {
        console.log('Node hover:', node?.name || 'null');
        setHoveredNode(node || null);
    }, []);

    const getDocLink = (node) => {
        if (!node) return null;
        if (node.type === 'thirdParty') {
            return `https://pypi.org/project/${node.name}/`;
        } else if (node.type === 'stdlib') {
            return `https://docs.python.org/3/library/${node.name}.html`;
        }
        return null;
    };

    if (graphData.nodes.length === 0) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                <p className="text-node-stdlib text-lg">No dependencies to display</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[500px]">
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={graphWidth}
                height={graphHeight}
                backgroundColor="transparent"
                nodeCanvasObjectMode={() => 'replace'}
                nodeCanvasObject={paintNode}
                linkColor={() => '#24265F'}
                linkWidth={1.5}
                linkOpacity={0.7}
                onNodeHover={handleNodeHover}
                onNodeClick={(node) => {
                    const link = getDocLink(node);
                    if (link) window.open(link, '_blank');
                }}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                enableNodeDrag={true}
            />

            {/* Custom Tooltip */}
            <AnimatePresence>
                {hoveredNode && (
                    <motion.div
                        key={hoveredNode.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="fixed pointer-events-auto"
                        style={{
                            left: Math.min(mousePos.x + 20, window.innerWidth - 300),
                            top: Math.min(mousePos.y + 10, window.innerHeight - 200),
                            zIndex: 9999,
                        }}
                    >
                        <div
                            className="bg-[#0a0a1a]/95 backdrop-blur-md rounded-xl p-4 min-w-[240px] max-w-[300px] border-2 shadow-2xl"
                            style={{ borderColor: NODE_COLORS[hoveredNode.type] }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor: NODE_COLORS[hoveredNode.type],
                                        boxShadow: `0 0 12px ${NODE_COLORS[hoveredNode.type]}`
                                    }}
                                />
                                <span className="text-white font-orbitron font-semibold text-lg truncate">
                                    {hoveredNode.name}
                                </span>
                            </div>

                            {/* Type Badge */}
                            <div className="mb-3">
                                {hoveredNode.type === 'thirdParty' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-400 text-sm rounded-lg border border-violet-500/30">
                                        📦 Third-Party (PyPI)
                                    </span>
                                )}
                                {hoveredNode.type === 'stdlib' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 text-gray-400 text-sm rounded-lg border border-gray-500/30">
                                        🐍 Standard Library
                                    </span>
                                )}
                                {hoveredNode.type === 'file' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm rounded-lg border border-blue-500/30">
                                        📄 Source File
                                    </span>
                                )}
                            </div>

                            {/* Full path for files */}
                            {hoveredNode.type === 'file' && hoveredNode.fullName !== hoveredNode.name && (
                                <p className="text-xs text-gray-400 mb-3 font-mono bg-black/30 px-2 py-1 rounded truncate" title={hoveredNode.fullName}>
                                    {hoveredNode.fullName}
                                </p>
                            )}

                            {/* Documentation Link */}
                            {hoveredNode.type !== 'file' && (
                                <a
                                    href={getDocLink(hoveredNode)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm transition-colors border border-cyan-500/30"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="font-medium">
                                        {hoveredNode.type === 'thirdParty' ? 'View on PyPI' : 'View Python Docs'}
                                    </span>
                                </a>
                            )}

                            <p className="text-[10px] text-gray-500 mt-3 text-center">
                                Click node to open link
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
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
            <div className="absolute bottom-4 right-4 bg-[#0a0a1a]/90 backdrop-blur rounded-lg px-3 py-2 text-[10px] text-gray-500 z-10 border border-gray-700">
                Scroll to zoom • Drag to pan • Click for docs
            </div>
        </div>
    );
}
