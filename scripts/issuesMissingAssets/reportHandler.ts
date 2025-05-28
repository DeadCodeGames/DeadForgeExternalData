import { REPORT_BEGIN_TAG, REPORT_END_TAG, BOT_COMMENT_IDENTIFIER, ReportSection, GitHubContext } from './types';

const MISSING_ASSETS_LABEL = 'missing deadforge assets';
const DEFAULT_ASSIGNEES = ['RichardKanshen'];

export async function addMissingAssetsLabel(context: GitHubContext, issueNumber: number): Promise<void> {
    await context.octokit.issues.addLabels({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
        labels: [MISSING_ASSETS_LABEL]
    });
}

export async function assignToAssetStaff(context: GitHubContext, issueNumber: number): Promise<void> {
    await context.octokit.issues.addAssignees({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
        assignees: DEFAULT_ASSIGNEES
    });
}

export async function findReportSection(body: string): Promise<ReportSection | null> {
    const beginIndex = body.indexOf(REPORT_BEGIN_TAG);
    if (beginIndex === -1) return null;

    const endIndex = body.indexOf(REPORT_END_TAG, beginIndex);
    if (endIndex === -1) return null;

    if (endIndex < beginIndex) return null;

    // Extract the content between the tags (not including the tags)
    const contentStart = beginIndex + REPORT_BEGIN_TAG.length;
    const contentEnd = endIndex;
  
    return {
        content: body.slice(contentStart, contentEnd).trim(),
        beginIndex,
        endIndex: endIndex + REPORT_END_TAG.length
    };
}

export async function findBotComment(context: GitHubContext, issueNumber: number): Promise<number | null> {
    const { data: comments } = await context.octokit.issues.listComments({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
    });

    // Find the most recent comment by the bot that starts with our identifier
    const botComment = comments
        .reverse()
        .find(comment => 
            comment.user.type === 'Bot' && 
            (comment.body as string).includes(`<!-- ${BOT_COMMENT_IDENTIFIER} -->`)
        );

    return botComment ? botComment.id : null;
}

export async function updateOrCreateReportComment(
    context: GitHubContext,
    issueNumber: number,
    reportContent: string
): Promise<void> {
    const existingCommentId = await findBotComment(context, issueNumber);

    const commentBody = `<!-- ${BOT_COMMENT_IDENTIFIER} -->\n${reportContent}`;

    if (existingCommentId) {
    // Update existing comment
        await context.octokit.issues.updateComment({
            owner: context.owner,
            repo: context.repo,
            comment_id: existingCommentId,
            body: commentBody,
        });
    } else {
    // Create new comment
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: commentBody,
        });
    }
} 