import { REPORT_BEGIN_TAG, REPORT_END_TAG, BOT_COMMENT_IDENTIFIER, ReportSection, GitHubContext } from './types';

const MISSING_ASSETS_LABEL = 'missing deadforge assets';
const DEFAULT_ASSIGNEES = ['RichardKanshen'];
const THANK_YOU_MESSAGE = (username: string) => `# Hey ${username}! 👋

Thank you for reporting these missing assets! All the missing assets have been resolved. 
Your contribution helps make DeadForge better for everyone. 🎮✨

This issue will now be closed.
---
###### If you want to report more missing assets, please you can create a comment with the following format:

\`\`\`
${REPORT_BEGIN_TAG}
<report JSON here>
${REPORT_END_TAG}
\`\`\`

This will automatically update the report and reopen the issue if there are new missing assets. Thank you for your contribution, and helping us stay organized! ^^`;
export async function addMissingAssetsLabel(context: GitHubContext, issueOrPullRequestNumber: number): Promise<void> {
    await context.octokit.issues.addAssignees({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueOrPullRequestNumber,
        assignees: DEFAULT_ASSIGNEES
    });
    await context.octokit.issues.addLabels({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueOrPullRequestNumber,
        labels: [MISSING_ASSETS_LABEL]
    });
    await context.octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
        owner: context.owner,
        repo: context.repo,
        issue_number: issueOrPullRequestNumber,
        type: "Assets"
    });
}

export async function findReportSection(body: string): Promise<ReportSection | null> {
    const beginIndex = body.indexOf(REPORT_BEGIN_TAG);
    if (beginIndex === -1) return null;

    const endIndex = body.indexOf(REPORT_END_TAG, beginIndex);
    if (endIndex === -1) return null;

    if (endIndex < beginIndex) return null;

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

    const botComment = comments
        .reverse()
        .find(comment => 
            comment.user?.login === 'deadcodebot' && 
            (comment.body as string).includes(`<!-- ${BOT_COMMENT_IDENTIFIER} -->`)
        );

    return botComment ? botComment.id : null;
}

async function closeIssue(
    context: GitHubContext,
    issueNumber: number,
): Promise<void> {
    const { data: issue } = await context.octokit.issues.get({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
    });

    const creatorUsername = issue.user?.login ? `@${issue.user.login}` : 'contributor';

    await context.octokit.issues.createComment({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
        body: THANK_YOU_MESSAGE(creatorUsername),
    });
    await context.octokit.issues.update({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
        state: 'closed'
    });
}

async function hasCompletelyMissingAssets(reportContent: string): Promise<boolean> {
    return reportContent.includes('❌');
}

export async function updateOrCreateReportComment(
    context: GitHubContext,
    issueNumber: number,
    reportContent: string
): Promise<void> {
    const existingCommentId = await findBotComment(context, issueNumber);
    const commentBody = `<!-- ${BOT_COMMENT_IDENTIFIER} -->\n${reportContent}`;

    const { data: issue } = await context.octokit.issues.get({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber,
    });

    if (existingCommentId) {
        await context.octokit.issues.updateComment({
            owner: context.owner,
            repo: context.repo,
            comment_id: existingCommentId,
            body: commentBody,
        });
    } else {
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: commentBody,
        });
    }

    if (reportContent.includes('(✨RESOLVED✨)') && issue.state === 'open') {
        await closeIssue(context, issueNumber);
    } else if (issue.state === 'closed' && await hasCompletelyMissingAssets(reportContent)) {
        await context.octokit.issues.update({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            state: 'open'
        });
        
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: "This issue has been reopened because there are still completely missing assets that need to be resolved. Assets marked with ❌ are missing, and need to be resolved.\nAfter these issues are resolved, this issue will be closed automatically."
        });
    }
} 