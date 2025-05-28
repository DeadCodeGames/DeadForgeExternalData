export const REPORT_BEGIN_TAG = '---MISSING_ASSETS_REPORT_BEGIN---';
export const REPORT_END_TAG = '---MISSING_ASSETS_REPORT_END---';
export const BOT_COMMENT_IDENTIFIER = '🤖 Missing Assets Reporter';

export interface ReportSection {
    content: string;
    beginIndex: number;
    endIndex: number;
}

export interface GitHubContext {
    owner: string;
    repo: string;
    octokit: any; // We'll properly type this when we need more specific types
} 