import { Octokit } from '@octokit/rest';
import { parse } from 'jsonc-parser';
import * as fs from 'fs/promises';
import { GitHubContext, PR_REVIEW_COMMENT_IDENTIFIER, AssetChange, ReviewResult, MediaEntry } from './types';
import { addMissingAssetsLabel } from '../issuesMissingAssets/reportHandler';
import { findReportSection } from '../issuesMissingAssets/reportHandler';
import type { RestEndpointMethodTypes } from '@octokit/rest';

const ASSETS_DIR = 'DeadForgeAssets';
const GAMES_DIR = 'DeadForgeAssets/curated/games';
const DOWNLOAD_FAILURES_FILE = 'download_failures.txt';

function findMediaEntryDifferences(oldEntry: MediaEntry, newEntry: MediaEntry): { field: string; oldValue: any; newValue: any; }[] {
    const differences: { field: string; oldValue: any; newValue: any; }[] = [];
    
    function compareObjects(path: string, oldObj: any, newObj: any) {
        if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
            if (oldObj !== newObj) {
                differences.push({ field: path, oldValue: oldObj, newValue: newObj });
            }
            return;
        }

        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
        
        for (const key of allKeys) {
            const newPath = path ? `${path}.${key}` : key;
            
            if (!(key in oldObj)) {
                differences.push({ field: newPath, oldValue: undefined, newValue: newObj[key] });
            } else if (!(key in newObj)) {
                differences.push({ field: newPath, oldValue: oldObj[key], newValue: undefined });
            } else if (typeof oldObj[key] === 'object' && typeof newObj[key] === 'object') {
                compareObjects(newPath, oldObj[key], newObj[key]);
            } else if (oldObj[key] !== newObj[key]) {
                differences.push({ field: newPath, oldValue: oldObj[key], newValue: newObj[key] });
            }
        }
    }

    compareObjects('', oldEntry, newEntry);
    return differences;
}

async function getAssetChanges(context: GitHubContext): Promise<AssetChange[]> {
    const { data: files } = await context.octokit.pulls.listFiles({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.prNumber,
    });

    const changes: AssetChange[] = [];
    
    for (const file of files) {
        if (!file.filename.startsWith(GAMES_DIR) || !file.filename.endsWith('.jsonc')) continue;
        
        // Get the content of the changed file in the PR
        const { data: content } = await context.octokit.repos.getContent({
            owner: context.owner,
            repo: context.repo,
            path: file.filename,
            ref: `refs/pull/${context.prNumber}/head`
        });

        if ('content' in content) {
            const decodedContent = Buffer.from(content.content, 'base64').toString();
            const newGameData = parse(decodedContent);
            
            try {
                // Try to get the base branch content
                const { data: baseContent } = await context.octokit.repos.getContent({
                    owner: context.owner,
                    repo: context.repo,
                    path: file.filename,
                    ref: 'main'
                });

                if ('content' in baseContent) {
                    // File exists in base branch, compare changes
                    const baseDecodedContent = Buffer.from(baseContent.content, 'base64').toString();
                    const baseGameData = parse(baseDecodedContent);

                    // Compare media entries
                    if (newGameData.media) {
                        for (const [mediaType, newEntry] of Object.entries(newGameData.media)) {
                            const baseEntry = baseGameData.media?.[mediaType];
                            if (!baseEntry) {
                                // New media type added
                                changes.push({
                                    type: 'added',
                                    path: file.filename,
                                    mediaType,
                                    newValue: newEntry as MediaEntry
                                });
                            } else {
                                // Compare entries for modifications
                                const differences = findMediaEntryDifferences(
                                    baseEntry as MediaEntry,
                                    newEntry as MediaEntry
                                );
                                if (differences.length > 0) {
                                    changes.push({
                                        type: 'modified',
                                        path: file.filename,
                                        mediaType,
                                        oldValue: baseEntry as MediaEntry,
                                        newValue: newEntry as MediaEntry,
                                        changes: differences
                                    });
                                }
                            }
                        }

                        // Check for removed media types
                        if (baseGameData.media) {
                            for (const [mediaType, baseEntry] of Object.entries(baseGameData.media)) {
                                if (!newGameData.media[mediaType]) {
                                    changes.push({
                                        type: 'removed',
                                        path: file.filename,
                                        mediaType,
                                        oldValue: baseEntry as MediaEntry
                                    });
                                }
                            }
                        }
                    }
                } else {
                    // New file added
                    if (newGameData.media) {
                        for (const [mediaType, entry] of Object.entries(newGameData.media)) {
                            changes.push({
                                type: 'added',
                                path: file.filename,
                                mediaType,
                                newValue: entry as MediaEntry
                            });
                        }
                    }
                }
            } catch (error) {
                // File doesn't exist in base branch, treat all as new
                if (newGameData.media) {
                    for (const [mediaType, entry] of Object.entries(newGameData.media)) {
                        changes.push({
                            type: 'added',
                            path: file.filename,
                            mediaType,
                            newValue: entry as MediaEntry
                        });
                    }
                }
            }
        }
    }

    return changes;
}

interface TreeNode {
    [key: string]: TreeNode | AssetChange[];
}

function buildChangeTree(changes: AssetChange[]): TreeNode {
    const tree: TreeNode = {};
    
    for (const change of changes) {
        const pathParts = change.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // Navigate/create the tree structure
        let current = tree;
        const treePath = ['DeadForgeAssets', 'curated', 'games', fileName, 'media', change.mediaType];
        
        for (const part of treePath) {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part] as TreeNode;
        }
        
        // Store the change at the leaf
        if (!current._changes) {
            current._changes = [];
        }
        (current._changes as AssetChange[]).push(change);
    }
    
    return tree;
}

function formatObjectValue(obj: any, prefix: string = ''): string {
    if (typeof obj !== 'object' || obj === null) {
        return `"${obj}"`;
    }
    
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    
    let result = '{\n';
    entries.forEach(([key, value], index) => {
        const isLast = index === entries.length - 1;
        const formattedValue = typeof value === 'object' 
            ? formatObjectValue(value, prefix + '  ')
            : `"${value}"`;
        result += `${prefix}  "${key}": ${formattedValue}${isLast ? '' : ','}\n`;
    });
    result += `${prefix}}`;
    return result;
}

function formatTreeNode(node: TreeNode, prefix: string = ' ', isLast: boolean = true, depth: number = 0): string {
    let result = '';
    const entries = Object.entries(node).filter(([key]) => key !== '_changes');
    const changes = node._changes as AssetChange[] || [];
    
    // Handle changes at this node
    if (changes.length > 0) {
        for (const change of changes) {
            if (change.type === 'added' && change.newValue) {
                result += formatAddedNode(change.newValue, prefix);
            } else if (change.type === 'removed' && change.oldValue) {
                result += formatRemovedNode(change.oldValue, prefix);
            } else if (change.type === 'modified' && change.changes) {
                result += formatModifiedNode(change.changes, prefix);
            }
        }
    }
    
    // Handle child nodes
    entries.forEach(([key, childNode], index) => {
        const isLastEntry = index === entries.length - 1;
        const connector = isLastEntry ? '└──' : '├──';
        result += `${prefix}${connector} ${key}\n`;
        
        const nextPrefix = prefix + (isLastEntry ? '    ' : '│   ');
        result += formatTreeNode(childNode as TreeNode, nextPrefix, isLastEntry, depth + 1);
    });
    
    return result;
}

function formatAddedNode(value: any, prefix: string, path: string[] = []): string {
    let result = '';
    
    if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val], index, arr) => {
            const isLast = index === arr.length - 1;
            const newPath = [...path, key];
            const connector = isLast ? '└──' : '├──';
            result += `${prefix}${connector} ${key}\n`;
            
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            if (typeof val === 'object' && val !== null) {
                result += formatAddedNode(val, nextPrefix, newPath);
            } else {
                const linePrefix = nextPrefix.replace(/[└├]──\s*$/, '');
                result += `+${linePrefix.slice(1)}└── "${val}"\n`;
            }
        });
    } else {
        const linePrefix = prefix.replace(/[└├]──\s*$/, '');
        result += `+${linePrefix.slice(1)}└── "${value}"\n`;
    }
    
    return result;
}

function formatRemovedNode(value: any, prefix: string, path: string[] = []): string {
    let result = '';
    
    if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val], index, arr) => {
            const isLast = index === arr.length - 1;
            const newPath = [...path, key];
            const connector = isLast ? '└──' : '├──';
            result += `${prefix}${connector} ${key}\n`;
            
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            if (typeof val === 'object' && val !== null) {
                result += formatRemovedNode(val, nextPrefix, newPath);
            } else {
                const linePrefix = nextPrefix.replace(/[└├]──\s*$/, '');
                result += `-${linePrefix.slice(1)}└── "${val}"\n`;
            }
        });
    } else {
        const linePrefix = prefix.replace(/[└├]──\s*$/, '');
        result += `-${linePrefix.slice(1)}└── "${value}"\n`;
    }
    
    return result;
}

function formatModifiedNode(changes: { field: string; oldValue: any; newValue: any; }[], prefix: string): string {
    let result = '';
    const changesByPath = new Map<string, { oldValue: any; newValue: any; }>();
    
    // Group changes by their parent path
    changes.forEach(change => {
        const parts = change.field.split('.');
        const fieldName = parts.pop()!;
        const parentPath = parts.join('.');
        
        if (!changesByPath.has(parentPath)) {
            changesByPath.set(parentPath, { oldValue: {}, newValue: {} });
        }
        const entry = changesByPath.get(parentPath)!;
        
        if (change.oldValue !== undefined) {
            entry.oldValue[fieldName] = change.oldValue;
        }
        if (change.newValue !== undefined) {
            entry.newValue[fieldName] = change.newValue;
        }
    });
    
    // Format each group of changes
    changesByPath.forEach((values, path) => {
        if (path) {
            const pathParts = path.split('.');
            let currentPrefix = prefix;
            pathParts.forEach((part, index) => {
                const isLast = index === pathParts.length - 1;
                const connector = isLast ? '└──' : '├──';
                result += `${currentPrefix}${connector} ${part}\n`;
                currentPrefix += isLast ? '    ' : '│   ';
            });
            prefix = currentPrefix;
        }

        const allKeys = new Set([...Object.keys(values.oldValue), ...Object.keys(values.newValue)]);
        const sortedKeys = Array.from(allKeys).sort();
        
        sortedKeys.forEach((key, index) => {
            const isLast = index === sortedKeys.length - 1;
            const connector = isLast ? '└──' : '├──';
            const oldVal = values.oldValue[key];
            const newVal = values.newValue[key];
            
            if (typeof oldVal === 'object' || typeof newVal === 'object') {
                result += `${prefix}${connector} ${key}\n`;
                const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                
                if (oldVal && newVal) {
                    // Both objects exist, compare their properties
                    const subChanges = Object.keys({ ...oldVal, ...newVal }).map(subKey => ({
                        field: subKey,
                        oldValue: oldVal[subKey],
                        newValue: newVal[subKey]
                    }));
                    result += formatModifiedNode(subChanges, nextPrefix);
                } else {
                    // One object is missing, show full add/remove
                    if (newVal) {
                        Object.entries(newVal).forEach(([subKey, value], idx, arr) => {
                            const isLastItem = idx === arr.length - 1;
                            const linePrefix = nextPrefix.replace(/[└├]──\s*$/, '');
                            result += `+${linePrefix}${isLastItem ? '└' : '├'}── "${value}"\n`;
                        });
                    }
                    if (oldVal) {
                        Object.entries(oldVal).forEach(([subKey, value], idx, arr) => {
                            const isLastItem = idx === arr.length - 1;
                            const linePrefix = nextPrefix.replace(/[└├]──\s*$/, '');
                            result += `-${linePrefix}${isLastItem ? '└' : '├'}── "${value}"\n`;
                        });
                    }
                }
            } else {
                if (oldVal === undefined) {
                    result += `${prefix}${connector} ${key}\n`;
                    const linePrefix = prefix + (isLast ? '    ' : '│   ');
                    result += `+${linePrefix.slice(1)}└── "${newVal}"\n`;
                } else if (newVal === undefined) {
                    result += `${prefix}${connector} ${key}\n`;
                    const linePrefix = prefix + (isLast ? '    ' : '│   ');
                    result += `-${linePrefix.slice(1)}└── "${oldVal}"\n`;
                } else if (oldVal !== newVal) {
                    result += `${prefix}${connector} ${key}\n`;
                    const linePrefix = prefix + (isLast ? '    ' : '│   ');
                    result += `-${linePrefix.slice(1)}├── "${oldVal}"\n`;
                    result += `+${linePrefix.slice(1)}└── "${newVal}"\n`;
                }
            }
        });
    });
    
    return result;
}

function formatAllChangesTree(changes: AssetChange[]): string {
    if (changes.length === 0) return '';
    
    const tree = buildChangeTree(changes);
    let result = '.\n';
    result += formatTreeNode(tree);
    
    return result;
}

interface Report {
    source: string;
    id: string | number;
    name: string;
    missingAssets: string[];
}

interface ReportData {
    reports: Report[];
}

interface GameMatch {
    source: string;
    id: string;
}

interface GameFile {
    matches: GameMatch[];
    media: {
        iconUrl?: MediaEntry;
        headerUrl?: MediaEntry;
        capsuleUrl?: MediaEntry;
        heroUrl?: MediaEntry;
        logoUrl?: MediaEntry;
    };
}

async function getRelatedIssues(context: GitHubContext, changes: AssetChange[]): Promise<Array<{number: number; title: string; url: string; labels: string[]}>> {
    // Extract unique game identifiers from the changed files' contents
    const gameIds = new Map<string, GameMatch>();
    
    for (const change of changes) {
        try {
            // Get the content of the changed file
            const { data: content } = await context.octokit.repos.getContent({
                owner: context.owner,
                repo: context.repo,
                path: change.path,
                ref: `refs/pull/${context.prNumber}/head`
            });

            if ('content' in content) {
                const decodedContent = Buffer.from(content.content, 'base64').toString();
                const gameData = parse(decodedContent) as GameFile;
                
                // Add all matches from the file
                for (const match of gameData.matches) {
                    const gameKey = `${match.source}/${match.id}`;
                    gameIds.set(gameKey, match);
                }
            }
        } catch (error) {
            console.error(`Error reading file ${change.path}:`, error);
        }
    }

    // Fetch all open issues with the 'missing deadforge assets' label
    const { data: issues } = await context.octokit.issues.listForRepo({
        owner: context.owner,
        repo: context.repo,
        state: 'open',
        labels: 'missing deadforge assets'
    });

    // Filter issues that mention any of our game IDs
    const relatedIssues: Array<{number: number; title: string; url: string; labels: string[]}> = [];
    for (const issue of issues) {
        const issueBody = issue.body || '';
        const reportSection = await findReportSection(issueBody);
        
        if (reportSection) {
            try {
                const reportData: ReportData = parse(reportSection.content);
                const hasRelatedGame = reportData.reports.some(report => {
                    const gameKey = `${report.source}/${report.id}`;
                    return gameIds.has(gameKey);
                });

                if (hasRelatedGame) {
                    relatedIssues.push({
                        number: issue.number,
                        title: issue.title,
                        url: issue.html_url,
                        labels: (issue.labels as RestEndpointMethodTypes['issues']['listForRepo']['response']['data'][0]['labels'])
                            .map(label => typeof label === 'string' ? label : label.name)
                            .filter((label): label is string => label !== null)
                    });
                }
            } catch (error) {
                console.error(`Error parsing report in issue #${issue.number}:`, error);
            }
        }
    }

    return relatedIssues;
}

async function generateReviewComment(result: ReviewResult): Promise<string> {
    let comment = `<!-- ${PR_REVIEW_COMMENT_IDENTIFIER} -->\n# PR Asset Review Report 🎮\n\n`;

    if (result.changes.length === 0) {
        comment += '## No asset changes detected\n\n';
        return comment;
    }

    comment += '## Asset Changes\n\n';
    
    // Generate the unified tree for all changes
    const treeOutput = formatAllChangesTree(result.changes);
    if (treeOutput) {
        comment += '```diff\n';
        comment += treeOutput;
        comment += '```\n\n';
    }

    if (result.relatedIssues && result.relatedIssues.length > 0) {
        comment += '## 📝 Related Open Issues\n\n';
        for (const issue of result.relatedIssues) {
            comment += `- [#${issue.number}](${issue.url}) - ${issue.title}\n`;
        }
        comment += '\n';
    }

    if (result.downloadFailures.length > 0) {
        comment += '## ⚠️ Download Failures\n\n';
        for (const failure of result.downloadFailures) {
            comment += `- ${failure}\n`;
        }
        comment += '\n';
    }

    if (result.validationErrors.length > 0) {
        comment += '## ❌ Validation Errors\n\n';
        for (const error of result.validationErrors) {
            comment += `- ${error}\n`;
        }
        comment += '\n';
    }

    if (!result.hasIssues) {
        comment += '## ✅ All checks passed!\n\n';
        comment += 'All assets are accessible and properly configured.\n';
    }

    return comment;
}

async function updatePrReview(context: GitHubContext, reviewComment: string): Promise<void> {
    // List all PR comments
    const { data: comments } = await context.octokit.issues.listComments({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.prNumber,
    });

    // Find existing bot comment
    const existingComment = comments.find(comment => 
        comment.body?.includes(PR_REVIEW_COMMENT_IDENTIFIER)
    );

    if (existingComment) {
        // Update existing comment
        await context.octokit.issues.updateComment({
            owner: context.owner,
            repo: context.repo,
            comment_id: existingComment.id,
            body: reviewComment,
        });
    } else {
        // Create new comment
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: context.prNumber,
            body: reviewComment,
        });
    }
}

async function main() {
    const prNumber = parseInt(process.env.PR_NUMBER || '', 10);
    if (isNaN(prNumber)) {
        throw new Error('PR_NUMBER environment variable is required');
    }

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    if (!owner || !repo) {
        throw new Error('GITHUB_REPOSITORY environment variable is required');
    }

    const octokit = new Octokit({
        auth: process.env.SERVICE_BOT_PAT
    });

    const context: GitHubContext = {
        owner,
        repo,
        octokit,
        prNumber
    };

    try {
        // Get asset changes
        const changes = await getAssetChanges(context);

        if (changes.length > 0) {
            await addMissingAssetsLabel(context, prNumber);
        }
        
        // Check for download failures
        let downloadFailures: string[] = [];
        try {
            const failuresContent = await fs.readFile(DOWNLOAD_FAILURES_FILE, 'utf-8');
            downloadFailures = failuresContent.split('\n').filter(Boolean);
        } catch (error) {
            // File might not exist, which is fine
        }

        // Check for validation errors (from violations.json)
        let validationErrors: string[] = [];
        try {
            const violationsContent = await fs.readFile('violations.json', 'utf-8');
            const violations = JSON.parse(violationsContent);
            validationErrors = violations.map((v: any) => v.message);
        } catch (error) {
            // File might not exist, which is fine
        }

        // Get related issues
        const relatedIssues = await getRelatedIssues(context, changes);

        const result: ReviewResult = {
            changes,
            downloadFailures,
            validationErrors,
            hasIssues: downloadFailures.length > 0 || validationErrors.length > 0,
            relatedIssues
        };

        // Generate and post review comment
        const reviewComment = await generateReviewComment(result);
        await updatePrReview(context, reviewComment);

        // Exit with error if there are issues
        if (result.hasIssues) {
            process.exit(1);
        }
    } catch (error) {
        console.error('Error during PR review:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});