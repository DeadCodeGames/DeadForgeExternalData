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

interface SimpleTreeNode {
    type: 'directory' | 'file' | 'value';
    name: string;
    children?: SimpleTreeNode[];
    value?: string;
}

function buildSimpleTree(changes: AssetChange[]): { oldTree: SimpleTreeNode, newTree: SimpleTreeNode } {
    const oldTree: SimpleTreeNode = { type: 'directory', name: '.', children: [] };
    const newTree: SimpleTreeNode = { type: 'directory', name: '.', children: [] };
    
    for (const change of changes) {
        const pathParts = change.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const treePath = ['DeadForgeAssets', 'curated', 'games', fileName, 'media', change.mediaType];
        
        if (change.type === 'added' || change.type === 'modified') {
            addToTree(newTree, treePath, change.newValue);
        }
        if (change.type === 'removed' || change.type === 'modified') {
            addToTree(oldTree, treePath, change.oldValue);
        }
    }
    
    return { oldTree, newTree };
}

function addToTree(root: SimpleTreeNode, path: string[], value: any) {
    let current = root;
    
    // Create path
    for (const part of path) {
        let child = current.children?.find(c => c.name === part);
        if (!child) {
            child = { type: 'directory', name: part, children: [] };
            current.children = current.children || [];
            current.children.push(child);
        }
        current = child;
    }
    
    // Add values
    if (value && typeof value === 'object') {
        for (const [key, val] of Object.entries(value)) {
            current.children = current.children || [];
            current.children.push({
                type: 'value',
                name: key,
                value: typeof val === 'object' ? JSON.stringify(val) : String(val)
            });
        }
    }
}

function formatTree(node: SimpleTreeNode, prefix: string = '', isLast: boolean = true): string[] {
    const lines: string[] = [];
    const connector = isLast ? '└──' : '├──';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    if (node.type === 'value') {
        // Handle object values specially
        if (node.value?.startsWith('{') && node.value?.endsWith('}')) {
            try {
                const obj = JSON.parse(node.value);
                lines.push(`${prefix}${connector} ${node.name}/`);
                Object.entries(obj).forEach(([key, val], idx, arr) => {
                    const isLastProp = idx === arr.length - 1;
                    const propConnector = isLastProp ? '└──' : '├──';
                    lines.push(`${childPrefix}${propConnector} ${key}: ${JSON.stringify(val)}`);
                });
            } catch {
                // If not valid JSON, treat as regular value
                lines.push(`${prefix}${connector} ${node.name}: ${node.value}`);
            }
        } else {
            lines.push(`${prefix}${connector} ${node.name}: ${node.value}`);
        }
    } else {
        if (node.name !== '.') {
            lines.push(`${prefix}${connector} ${node.name}`);
        }
        if (node.children) {
            const sortedChildren = node.children.sort((a, b) => {
                // Sort directories before values, then alphabetically
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            sortedChildren.forEach((child, index) => {
                const isLastChild = index === sortedChildren.length - 1;
                lines.push(...formatTree(
                    child,
                    node.name === '.' ? prefix : childPrefix,
                    isLastChild
                ));
            });
        }
    }
    
    return lines;
}

interface TreeGroup {
    path: string;
    lines: string[];
    indent: number;
}

function groupLines(lines: string[]): TreeGroup[] {
    const groups: TreeGroup[] = [];
    let currentGroup: TreeGroup | null = null;
    let rootIndent = -1;
    
    for (const line of lines) {
        const indent = line.search(/\S/);
        const content = line.trim();
        
        // Find the game file name level (e.g. "ZZZ.jsonc" or "Genshin Impact.jsonc")
        if (content.endsWith('.jsonc')) {
            if (currentGroup) {
                groups.push(currentGroup);
            }
            currentGroup = {
                path: content,
                lines: [line],
                indent: indent
            };
            rootIndent = indent;
        } else if (currentGroup && indent > rootIndent) {
            currentGroup.lines.push(line);
        } else {
            // Lines before any .jsonc files (like DeadForgeAssets, curated, games)
            if (!currentGroup) {
                currentGroup = {
                    path: 'root',
                    lines: [],
                    indent: 0
                };
                groups.push(currentGroup);
            }
            currentGroup.lines.push(line);
        }
    }
    
    if (currentGroup && currentGroup.path !== 'root') {
        groups.push(currentGroup);
    }
    
    return groups;
}

function diffTrees(oldLines: string[], newLines: string[]): string {
    const oldGroups = groupLines(oldLines);
    const newGroups = groupLines(newLines);
    
    let result = '';
    
    // First, find the root group and output it
    const oldRoot = oldGroups.find(g => g.path === 'root');
    const newRoot = newGroups.find(g => g.path === 'root');
    
    if (oldRoot && newRoot && oldRoot.lines.join('\n') === newRoot.lines.join('\n')) {
        result += oldRoot.lines.map(line => ` ${line}`).join('\n') + '\n';
    }
    
    // Get non-root groups
    const oldFileGroups = oldGroups.filter(g => g.path !== 'root');
    const newFileGroups = newGroups.filter(g => g.path !== 'root');
    
    // Find added files (in new but not in old)
    const addedFiles = newFileGroups.filter(newGroup => 
        !oldFileGroups.some(oldGroup => oldGroup.path === newGroup.path)
    );
    
    // Find removed files (in old but not in new)
    const removedFiles = oldFileGroups.filter(oldGroup => 
        !newFileGroups.some(newGroup => newGroup.path === oldGroup.path)
    );
    
    // Find modified files (in both)
    const modifiedFiles = newFileGroups.filter(newGroup => 
        oldFileGroups.some(oldGroup => oldGroup.path === newGroup.path)
    );
    
    // Output added files first
    for (const group of addedFiles) {
        result += group.lines.map(line => `+${line}`).join('\n') + '\n';
    }
    
    // Output removed files
    for (const group of removedFiles) {
        result += group.lines.map(line => `-${line}`).join('\n') + '\n';
    }
    
    // Output modified files
    for (const newGroup of modifiedFiles) {
        const oldGroup = oldFileGroups.find(g => g.path === newGroup.path)!;
        if (oldGroup.lines.join('\n') !== newGroup.lines.join('\n')) {
            // If the content is different, show the diff
            result += diffLinesWithContext(oldGroup.lines, newGroup.lines);
        } else {
            // If the content is the same, show it unchanged
            result += oldGroup.lines.map(line => ` ${line}`).join('\n') + '\n';
        }
    }
    
    return result.trim();
}

function diffLinesWithContext(oldLines: string[], newLines: string[]): string {
    let result = '';
    let i = 0, j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
        if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
            result += ` ${oldLines[i]}\n`;
            i++;
            j++;
        } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] > newLines[j])) {
            result += `+${newLines[j]}\n`;
            j++;
        } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] < newLines[j])) {
            result += `-${oldLines[i]}\n`;
            i++;
        }
    }
    
    return result;
}

function formatAllChangesTree(changes: AssetChange[]): string {
    if (changes.length === 0) return '';
    
    const { oldTree, newTree } = buildSimpleTree(changes);
    const oldLines = formatTree(oldTree);
    const newLines = formatTree(newTree);
    
    return diffTrees(oldLines, newLines);
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
        comment += '\n```\n';
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