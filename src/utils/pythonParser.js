/**
 * Python Import Parser
 * Extracts import statements from Python source code
 */

// Regex patterns for different import styles
const IMPORT_PATTERNS = [
    // import module
    // import module as alias
    // import module1, module2
    /^import\s+([\w,\s]+)/gm,

    // from module import something
    // from module import (something, something_else)
    // from module import something as alias
    /^from\s+([\w.]+)\s+import/gm,
];

/**
 * Extract all imports from Python source code
 * @param {string} sourceCode - Python source code
 * @returns {string[]} - Array of unique module names
 */
export function extractImports(sourceCode) {
    const imports = new Set();

    // Remove comments and strings to avoid false positives
    const cleanedCode = removeCommentsAndStrings(sourceCode);

    // Pattern 1: import x, import x as y, import x, y, z
    const importRegex = /^import\s+(.+)$/gm;
    let match;

    while ((match = importRegex.exec(cleanedCode)) !== null) {
        const importPart = match[1];
        // Handle "import x as y" and "import x, y, z"
        const modules = importPart.split(',').map(m => {
            // Remove "as alias" part
            return m.trim().split(/\s+as\s+/)[0].trim();
        });

        modules.forEach(mod => {
            if (mod && !mod.startsWith('#')) {
                // Get root module
                const rootModule = mod.split('.')[0];
                if (rootModule && /^[a-zA-Z_][\w]*$/.test(rootModule)) {
                    imports.add(rootModule);
                }
            }
        });
    }

    // Pattern 2: from x import y
    const fromRegex = /^from\s+([\w.]+)\s+import/gm;

    while ((match = fromRegex.exec(cleanedCode)) !== null) {
        const modulePath = match[1];
        // Skip relative imports (starting with .)
        if (!modulePath.startsWith('.')) {
            const rootModule = modulePath.split('.')[0];
            if (rootModule && /^[a-zA-Z_][\w]*$/.test(rootModule)) {
                imports.add(rootModule);
            }
        }
    }

    return Array.from(imports).sort();
}

/**
 * Remove comments and string literals from Python code
 * to avoid extracting imports from comments/strings
 */
function removeCommentsAndStrings(code) {
    // Remove triple-quoted strings
    let cleaned = code.replace(/'''[\s\S]*?'''/g, '');
    cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');

    // Remove single-quoted strings
    cleaned = cleaned.replace(/'[^'\\]*(\\.[^'\\]*)*'/g, '');
    cleaned = cleaned.replace(/"[^"\\]*(\\.[^"\\]*)*"/g, '');

    // Remove comments
    cleaned = cleaned.replace(/#.*/g, '');

    return cleaned;
}

/**
 * Parse multiple Python files and aggregate imports
 * @param {Array<{name: string, content: string}>} files - Array of file objects
 * @returns {{files: Object, allImports: string[]}}
 */
export function parseMultipleFiles(files) {
    const result = {
        files: {},
        allImports: new Set(),
    };

    files.forEach(file => {
        const imports = extractImports(file.content);
        result.files[file.name] = imports;
        imports.forEach(imp => result.allImports.add(imp));
    });

    result.allImports = Array.from(result.allImports).sort();
    return result;
}
