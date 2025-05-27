import fs from "fs";
import path from "path";

interface Report {
    source: string;
    id: string | number;
    name: string;
    missingAssets: string[];
}

interface ReportData {
    reports: Report[];
}

interface AssetData {
    filePath: string | Record<string, string>;
    remoteUrl: string | Record<string, string>;
    hash: string | Record<string, string>;
}

interface CurrentAssetData {
    matches: Array<{
        source: string;
        id: string;
    }>;
    media: {
        iconUrl?: AssetData;
        headerUrl?: AssetData;
        capsuleUrl?: AssetData;
        heroUrl?: AssetData;
        logoUrl?: AssetData;
    };
}

function checkAssetExists(asset: AssetData): boolean {
    if (typeof asset.hash === 'string') {
        return asset.hash !== '404';
    }
    
    // If hash is an object, check all values
    return Object.values(asset.hash).every(hash => hash !== '404');
}

function findExistingAssets(report: { source: string; id: string | number; missingAssets: string[] }, currentAssetsData: CurrentAssetData[]): string[] {
    const matchingAssetData = currentAssetsData.find(assetData => 
        assetData.matches.some(match => 
            match.source === report.source && 
            match.id === String(report.id)
        )
    );

    if (!matchingAssetData) {
        return [];
    }

    const existingAssets: string[] = [];
    const { media } = matchingAssetData;

    const assetTypes = ['icon', 'header', 'capsule', 'hero', 'logo'] as const;
    
    assetTypes.forEach(type => {
        const assetKey = `${type}Url` as keyof typeof media;
        const asset = media[assetKey];
        
        if (asset && checkAssetExists(asset)) {
            existingAssets.push(type);
        }
    });

    return existingAssets;
}

export default function generateMarkdownReport(jsonData: string): string {
    try {
        const data: ReportData = JSON.parse(jsonData);
        const reports = data.reports;

        if (!reports || reports.length === 0) {
            return "# Missing Asset Report\n\nNo missing assets found.";
        }

        const currentAssetsData = JSON.parse(
            fs.readFileSync(path.join(__dirname, "..", "..", "DeadForgeAssets", "curated", "list.json"), "utf-8")
        );

        console.log(reports, currentAssetsData);

        if (!currentAssetsData) {
            throw new Error("No current assets data found. Has the compilation succeeded?");
        }
        
        const groupedReports: { [key: string]: Report[] } = {};
        const groupedResolvedReports: { [key: string]: Report[] } = {};

        reports.forEach((report) => {
            const existingAssets = findExistingAssets(report, currentAssetsData);
            const isFullyResolved = report.missingAssets.every(asset => existingAssets.includes(asset));
            
            const targetGroup = isFullyResolved ? groupedResolvedReports : groupedReports;
            if (!targetGroup[report.source]) {
                targetGroup[report.source] = [];
            }
            targetGroup[report.source].push(report);
        });

        let markdown = "# Missing Asset Report";

        // Show unresolved cases if any exist
        const hasUnresolvedCases = Object.keys(groupedReports).length > 0;
        if (hasUnresolvedCases) {
            markdown += "\n\nThe DeadForge Library is missing assets for the following games:\n\n";

            for (const source in groupedReports) {
                markdown += `## ${source.toUpperCase()}\n\n`;

                groupedReports[source].forEach((report) => {
                    markdown += `### ${report.name} (ID: ${report.id})\n\n`;
                    markdown += "Missing assets:\n";
                    
                    const existingAssets = findExistingAssets(report, currentAssetsData);
                    
                    report.missingAssets.forEach((asset) => {
                        const exists = existingAssets.includes(asset);
                        markdown += `- ${exists ? '✅' : '❌'} ${asset}\n`;
                    });
                    markdown += "\n";
                });
            }
        }

        // Then show resolved cases if any exist
        const hasResolvedCases = Object.keys(groupedResolvedReports).length > 0;

        if (!hasUnresolvedCases && hasResolvedCases) {
            markdown += " (✨RESOLVED✨)\n\n";
        }

        if (hasResolvedCases) {
            if (hasUnresolvedCases) {
                markdown += "---\n\n";
            }
            markdown += "## ✨ Resolved Assets\n\n";
            markdown += "The following games have had all their missing assets resolved:\n\n";

            for (const source in groupedResolvedReports) {
                markdown += `### ${source.toUpperCase()}\n\n`;

                groupedResolvedReports[source].forEach((report) => {
                    markdown += `#### ${report.name} (ID: ${report.id})\n\n`;
                    markdown += "Resolved assets:\n";
                    
                    const existingAssets = findExistingAssets(report, currentAssetsData);
                    
                    report.missingAssets.forEach((asset) => {
                        markdown += `- ✅ ${asset}\n`;
                    });
                    markdown += "\n";
                });
            }
        }

        // If no cases at all, show a message
        if (!hasUnresolvedCases && !hasResolvedCases) {
            markdown += "No missing assets found.";
        }

        return markdown;
    } catch (error) {
        console.error("Error parsing JSON or generating Markdown:", error);
        return "# Error\n\nCould not generate report due to an error.";
    }
}
