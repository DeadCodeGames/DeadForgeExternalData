import { Octokit } from '@octokit/rest';

export const PR_REVIEW_COMMENT_IDENTIFIER = '🤖 PR Asset Review';

export interface GitHubContext {
    owner: string;
    repo: string;
    octokit: Octokit;
    prNumber: number;
}

export interface AssetChange {
    type: 'added' | 'modified' | 'removed';
    path: string;
    mediaType: string;
    url: string | Record<string, string>;
    hash?: string | Record<string, string>;
}

export interface ReviewResult {
    changes: AssetChange[];
    downloadFailures: string[];
    validationErrors: string[];
    hasIssues: boolean;
} 