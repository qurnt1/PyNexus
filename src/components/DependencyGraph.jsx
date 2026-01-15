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
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
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
        const fontSize = Math.max(10 / globalScale, 3);

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
        ctx.fillStyle = color + '30';
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // White inner highlight
        ctx.beginPath();
        ctx.arc(node.x - size * 0.25, node.y - size * 0.25, size * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        // Label below the node
        ctx.font = `${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Text shadow/background for readability
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(6, 6, 23, 0.8)';
        ctx.fillRect(node.x - textWidth / 2 - 2, node.y + size + 2, textWidth + 4, fontSize + 4);

        // Text
        ctx.fillStyle = color;
        ctx.fillText(label, node.x, node.y + size + 4);
    }, []);

    const handleNodeHover = useCallback((node, event) => {
        if (node) {
            setHoveredNode(node);
            if (event) setTooltipPos({ x: event.clientX, y: event.clientY });
        } else {
            setHoveredNode(null);
        }
    }, []);

    const handlePointerMove = useCallback((event) => {
        if (hoveredNode) setTooltipPos({ x: event.clientX, y: event.clientY });
    }, [hoveredNode]);

    // Generate documentation link based on node type
    const getDocLink = (node) => {
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
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[500px]"
            onPointerMove={handlePointerMove}
        >
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={graphWidth}
                height={graphHeight}
                backgroundColor="transparent"
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node, color, ctx) => {
                    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, (node.val || 8) + 6, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                }}
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

            {/* Rich Tooltip */}
            <AnimatePresence>
                {hoveredNode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed pointer-events-auto z-50 glass rounded-xl p-4 min-w-[220px] max-w-[300px]"
                        style={{
                            left: Math.min(tooltipPos.x + 15, window.innerWidth - 320),
                            top: Math.min(tooltipPos.y + 15, window.innerHeight - 200),
                            borderColor: NODE_COLORS[hoveredNode.type],
                            borderWidth: '1px',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }}
                            />
                            <span className="text-white font-orbitron font-semibold truncate">
                                {hoveredNode.name}
                            </span>
                        </div>

                        {/* Type Badge */}
                        <div className="mb-3">
                            {hoveredNode.type === 'thirdParty' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-node-import/20 text-node-import text-xs rounded-md">
                                    📦 Third-Party (PyPI)
                                </span>
                            )}
                            {hoveredNode.type === 'stdlib' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-node-stdlib/20 text-node-stdlib text-xs rounded-md">
                                    🐍 Standard Library
                                </span>
                            )}
                            {hoveredNode.type === 'file' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-node-file/20 text-node-file text-xs rounded-md">
                                    📄 Source File
                                </span>
                            )}
                        </div>

                        {/* Full path for files */}
                        {hoveredNode.type === 'file' && hoveredNode.fullName !== hoveredNode.name && (
                            <p className="text-xs text-node-stdlib mb-2 truncate" title={hoveredNode.fullName}>
                                {hoveredNode.fullName}
                            </p>
                        )}

                        {/* Documentation Link */}
                        {hoveredNode.type !== 'file' && (
                            <a
                                href={getDocLink(hoveredNode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-cyber-highlight hover:text-white text-sm transition-colors group"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="w-3 h-3" />
                                <span>
                                    {hoveredNode.type === 'thirdParty' ? 'View on PyPI' : 'View Python Docs'}
                                </span>
                                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </a>
                        )}

                        {/* Click hint */}
                        {hoveredNode.type !== 'file' && (
                            <p className="text-[10px] text-node-stdlib/70 mt-2">
                                Click node to open link
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass rounded-lg p-3 text-xs space-y-2 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.file }} />
                    <span className="text-node-stdlib">Python Files</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.thirdParty }} />
                    <span className="text-node-stdlib">Third-Party</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.stdlib }} />
                    <span className="text-node-stdlib">Stdlib</span>
                </div>
            </div>

            {/* Controls hint */}
            <div className="absolute bottom-4 right-4 glass rounded-lg px-3 py-2 text-[10px] text-node-stdlib/70 z-10">
                Scroll to zoom • Drag to pan • Click nodes to open docs
            </div>
        </div>
    );
}
