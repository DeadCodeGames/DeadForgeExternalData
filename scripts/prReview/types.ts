import { Octokit } from '@octokit/rest';

export const PR_REVIEW_COMMENT_IDENTIFIER = '🤖 PR Asset Review';

export interface GitHubContext {
    owner: string;
    repo: string;
    octokit: Octokit;
    prNumber: number;
}

export interface MediaEntry {
    remoteUrl: string | Record<string, string>;
    filePath: string | Record<string, string>;
    hash?: string | Record<string, string>;
    logo_position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface AssetChange {
    type: 'added' | 'modified' | 'removed';
    path: string;
    mediaType: string;
    oldValue?: MediaEntry;
    newValue?: MediaEntry;
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
}

export interface ReviewResult {
    changes: AssetChange[];
    downloadFailures: string[];
    validationErrors: string[];
    hasIssues: boolean;
    relatedIssues?: Array<{
        number: number;
        title: string;
        url: string;
        labels: string[];
    }>;
} 