import { useRef, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';

const NODE_COLORS = {
    file: '#2D7DFF',     // Blue - Python files
    thirdParty: '#7C3AED', // Purple - Third-party libs
    stdlib: '#7F8AB8',   // Gray - Standard library
};

export default function DependencyGraph({ data, width, height }) {
    const graphRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Transform data into graph format
    const graphData = useMemo(() => {
        if (!data || !data.files) {
            return { nodes: [], links: [] };
        }

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        // Add file nodes
        Object.keys(data.files).forEach((fileName) => {
            const id = `file:${fileName}`;
            if (!nodeIds.has(id)) {
                nodes.push({
                    id,
                    name: fileName.split('/').pop(), // Get just the filename
                    fullName: fileName,
                    type: 'file',
                    val: 8, // Node size
                });
                nodeIds.add(id);
            }
        });

        // Add import nodes and links
        Object.entries(data.files).forEach(([fileName, imports]) => {
            const fileId = `file:${fileName}`;

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
                        val: isStdlib ? 3 : 5, // Smaller for stdlib
                    });
                    nodeIds.add(impId);
                }

                links.push({
                    source: fileId,
                    target: impId,
                });
            });
        });

        return { nodes, links };
    }, [data]);

    // Custom node rendering
    const paintNode = useCallback((node, ctx, globalScale) => {
        const size = node.val || 5;
        const color = NODE_COLORS[node.type] || NODE_COLORS.thirdParty;

        // Glow effect
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.arc(node.x, node.y, size * 2, 0, 2 * Math.PI);
        ctx.fill();

        // Main node
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner bright spot
        ctx.beginPath();
        ctx.arc(node.x - size * 0.2, node.y - size * 0.2, size * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }, []);

    // Handle node hover
    const handleNodeHover = useCallback((node, event) => {
        if (node) {
            setHoveredNode(node);
            if (event) {
                setTooltipPos({ x: event.clientX, y: event.clientY });
            }
        } else {
            setHoveredNode(null);
        }
    }, []);

    // Handle pointer move for tooltip positioning
    const handlePointerMove = useCallback((event) => {
        if (hoveredNode) {
            setTooltipPos({ x: event.clientX, y: event.clientY });
        }
    }, [hoveredNode]);

    if (graphData.nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-node-stdlib text-sm">Upload a Python project to visualize dependencies</p>
            </div>
        );
    }

    return (
        <div
            className="relative w-full h-full"
            onPointerMove={handlePointerMove}
        >
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={width}
                height={height}
                backgroundColor="transparent"
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node, color, ctx) => {
                    const size = node.val || 5;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                }}
                linkColor={() => '#24265F'}
                linkWidth={1}
                linkOpacity={0.6}
                onNodeHover={handleNodeHover}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                enableNodeDrag={true}
            />

            {/* Tooltip */}
            {hoveredNode && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed pointer-events-none z-50 glass rounded-lg px-3 py-2 text-sm"
                    style={{
                        left: tooltipPos.x + 15,
                        top: tooltipPos.y + 15,
                        borderColor: NODE_COLORS[hoveredNode.type],
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }}
                        />
                        <span className="text-white font-medium">{hoveredNode.name}</span>
                    </div>
                    <div className="text-xs text-node-stdlib mt-1 capitalize">
                        {hoveredNode.type === 'file' ? 'Python File' :
                            hoveredNode.type === 'stdlib' ? 'Standard Library' : 'Third-Party Package'}
                    </div>
                </motion.div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass rounded-lg p-3 text-xs space-y-2">
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
        </div>
    );
}
