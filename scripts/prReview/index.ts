import { Octokit } from '@octokit/rest';
import { parse } from 'jsonc-parser';
import * as fs from 'fs/promises';
import { GitHubContext, PR_REVIEW_COMMENT_IDENTIFIER, AssetChange, ReviewResult } from './types';
import { addMissingAssetsLabel } from '../issuesMissingAssets/reportHandler';

const ASSETS_DIR = 'DeadForgeAssets';
const GAMES_DIR = 'DeadForgeAssets/curated/games';
const DOWNLOAD_FAILURES_FILE = 'download_failures.txt';

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
                        for (const [mediaType, urlEntry] of Object.entries(newGameData.media)) {
                            const baseUrlEntry = baseGameData.media?.[mediaType];
                            if (!baseUrlEntry) {
                                // New media type added
                                changes.push({
                                    type: 'added',
                                    path: file.filename,
                                    mediaType,
                                    url: urlEntry as any,
                                    hash: (newGameData.media as any)[mediaType].hash
                                });
                            } else if (JSON.stringify(baseUrlEntry) !== JSON.stringify(urlEntry)) {
                                // Media type modified
                                changes.push({
                                    type: 'modified',
                                    path: file.filename,
                                    mediaType,
                                    url: urlEntry as any,
                                    hash: (newGameData.media as any)[mediaType].hash
                                });
                            }
                        }

                        // Check for removed media types
                        if (baseGameData.media) {
                            for (const [mediaType, urlEntry] of Object.entries(baseGameData.media)) {
                                if (!newGameData.media[mediaType]) {
                                    changes.push({
                                        type: 'removed',
                                        path: file.filename,
                                        mediaType,
                                        url: urlEntry as any,
                                        hash: (baseGameData.media as any)[mediaType].hash
                                    });
                                }
                            }
                        }
                    }
                } else {
                    // New file added
                    if (newGameData.media) {
                        for (const [mediaType, urlEntry] of Object.entries(newGameData.media)) {
                            changes.push({
                                type: 'added',
                                path: file.filename,
                                mediaType,
                                url: urlEntry as any,
                                hash: (newGameData.media as any)[mediaType].hash
                            });
                        }
                    }
                }
            } catch (error) {
                // File doesn't exist in base branch, treat all as new
                if (newGameData.media) {
                    for (const [mediaType, urlEntry] of Object.entries(newGameData.media)) {
                        changes.push({
                            type: 'added',
                            path: file.filename,
                            mediaType,
                            url: urlEntry as any,
                            hash: (newGameData.media as any)[mediaType].hash
                        });
                    }
                }
            }
        }
    }

    return changes;
}

async function generateReviewComment(result: ReviewResult): Promise<string> {
    let comment = `<!-- ${PR_REVIEW_COMMENT_IDENTIFIER} -->\n# PR Asset Review Report 🎮\n\n`;

    if (result.changes.length === 0) {
        comment += '## No asset changes detected\n\n';
        return comment;
    }

    comment += '## Asset Changes\n\n';
    
    const changeTypes = {
        added: '➕ Added',
        modified: '🔄 Modified',
        removed: '❌ Removed'
    };

    for (const type of ['added', 'modified', 'removed'] as const) {
        const typeChanges = result.changes.filter(c => c.type === type);
        if (typeChanges.length > 0) {
            comment += `### ${changeTypes[type]}\n\n`;
            for (const change of typeChanges) {
                comment += `- **${change.mediaType}** in \`${change.path}\`\n`;
                if (typeof change.url === 'string') {
                    comment += `  - URL: ${change.url}\n`;
                    if (change.hash) comment += `  - Hash: ${change.hash}\n`;
                } else {
                    comment += '  - Localized URLs:\n';
                    for (const [lang, url] of Object.entries(change.url)) {
                        comment += `    - ${lang}: ${url}\n`;
                        if (change.hash && typeof change.hash === 'object') {
                            comment += `      Hash: ${change.hash[lang]}\n`;
                        }
                    }
                }
            }
            comment += '\n';
        }
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

        const result: ReviewResult = {
            changes,
            downloadFailures,
            validationErrors,
            hasIssues: downloadFailures.length > 0 || validationErrors.length > 0
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