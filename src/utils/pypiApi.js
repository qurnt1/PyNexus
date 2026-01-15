/**
 * PyPI API Integration
 * Fetches package versions from PyPI
 */

const PYPI_API_BASE = 'https://pypi.org/pypi';

/**
 * Fetch the latest version of a package from PyPI
 * @param {string} packageName - The package name
 * @returns {Promise<string|null>} - Version string or null if failed
 */
export async function getLatestVersion(packageName) {
    try {
        const response = await fetch(`${PYPI_API_BASE}/${packageName}/json`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn(`Failed to fetch version for ${packageName}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.info?.version || null;
    } catch (error) {
        console.warn(`Error fetching version for ${packageName}:`, error.message);
        return null;
    }
}

/**
 * Fetch versions for multiple packages
 * @param {string[]} packages - Array of package names
 * @returns {Promise<Object>} - Object mapping package names to versions
 */
export async function getPackageVersions(packages) {
    const versions = {};

    // Batch requests with concurrency limit
    const BATCH_SIZE = 5;

    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
        const batch = packages.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (pkg) => {
            const version = await getLatestVersion(pkg);
            return { pkg, version };
        });

        const results = await Promise.all(promises);
        results.forEach(({ pkg, version }) => {
            versions[pkg] = version;
        });
    }

    return versions;
}

/**
 * Generate requirements.txt content with versions
 * @param {string[]} packages - Array of package names
 * @param {Object} versions - Object mapping package names to versions
 * @returns {string} - Requirements.txt content
 */
export function generateRequirementsTxt(packages, versions) {
    return packages
        .sort()
        .map(pkg => {
            const version = versions[pkg];
            return version ? `${pkg}==${version}` : pkg;
        })
        .join('\n');
}
