import { Octokit } from '@octokit/rest';
import { GitHubContext, REPORT_BEGIN_TAG, REPORT_END_TAG, ReportSection } from './types';
import { findReportSection } from './reportHandler';
import { parse } from 'jsonc-parser';

interface Report {
    source: string;
    id: string | number;
    name: string;
    missingAssets: string[];
}

interface ReportData {
    reports: Report[];
}

const UPDATE_COMMAND = '/update assets';
const DECLINE_MESSAGE = (username: string, hasOwnIssue: boolean, ownIssueUrl?: string, reportBody?: ReportSection | null) => {
    if (hasOwnIssue) {
        return `Hey @${username}! 👋\n\nIt looks like you already have your own missing assets issue at ${ownIssueUrl}. Please comment on that issue instead to update your missing assets report. This helps us keep things organized!\n\nThanks for understanding! 🙂`;
    }
    return `Hey @${username}! 👋\n\nTo help us keep things organized, we ask that you create your own missing assets issue to report missing assets. You can do that here:\n\n[Create a new missing assets issue](https://github.com/DeadForge/DeadForgeExternalData/issues/new?template=missing-asset-report.yml&title=Missing%20Assets%20Report&body=${encodeURIComponent(`### Missing Assets List\n\n${reportBody ? reportBody.content : '<paste your report contents here>'}`)})\n\nThanks for understanding! 🙂`;
};

export async function handleUpdateCommand(
    context: GitHubContext,
    issueNumber: number,
    commentBody: string,
    commentAuthor: string,
    issueAuthor: string
): Promise<void> {
    // Check if the comment contains the update command
    if (!commentBody.trim().startsWith(UPDATE_COMMAND)) {
        return;
    }

    // If commenter is not the issue author, handle accordingly
    if (commentAuthor !== issueAuthor) {
        // Check if the user has their own missing assets issue
        const { data: userIssues } = await context.octokit.issues.listForRepo({
            owner: context.owner,
            repo: context.repo,
            creator: commentAuthor,
            labels: 'missing deadforge assets',
            state: 'open'
        });

        const hasOwnIssue = userIssues.length > 0;
        const ownIssueUrl = hasOwnIssue ? userIssues[0].html_url || '' : undefined;

        // Reply with decline message
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: DECLINE_MESSAGE(commentAuthor, hasOwnIssue, ownIssueUrl, await findReportSection(commentBody))
        });
        return;
    }

    // Extract the new report from the comment
    const newReportSection = await findReportSection(commentBody);
    if (!newReportSection) {
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: `Hey @${commentAuthor}! I couldn't find a valid missing assets report in your comment. Make sure your report is wrapped in the correct tags:\n\n\`\`\`\n${REPORT_BEGIN_TAG}\n<your report here>\n${REPORT_END_TAG}\n\`\`\``
        });
        return;
    }

    // Get the issue body
    const { data: issue } = await context.octokit.issues.get({
        owner: context.owner,
        repo: context.repo,
        issue_number: issueNumber
    });

    // Extract the original report from the issue body
    const originalReportSection = await findReportSection(issue.body || '');
    if (!originalReportSection) {
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: `Hey @${commentAuthor}! I couldn't find the original missing assets report in the issue body. This is unexpected - please create a new issue instead.`
        });
        return;
    }

    try {
        // Parse both reports
        const originalReport: ReportData = parse(originalReportSection.content);
        const newReport: ReportData = parse(newReportSection.content);

        // Merge the reports
        const mergedReports = mergeReports(originalReport, newReport);

        // Create the updated issue body
        const updatedBody = 
            issue.body!.substring(0, originalReportSection.beginIndex) +
            REPORT_BEGIN_TAG +
            `\n${JSON.stringify(mergedReports)}\n` +
            REPORT_END_TAG +
            issue.body!.substring(originalReportSection.endIndex);

        // Update the issue body
        await context.octokit.issues.update({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: updatedBody
        });

        // Add a confirmation comment
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: `Hey @${commentAuthor}! I've updated the missing assets report with your new entries. 🎮✨`
        });

    } catch (error) {
        console.error('Error processing reports:', error);
        await context.octokit.issues.createComment({
            owner: context.owner,
            repo: context.repo,
            issue_number: issueNumber,
            body: `Hey @${commentAuthor}! I encountered an error while processing the reports. Please make sure your report is in valid JSON format.`
        });
    }
}

function mergeReports(original: ReportData, update: ReportData): ReportData {
    const reportMap = new Map<string, Report>();

    // Helper function to create a unique key for each report
    const getReportKey = (report: Report) => `${report.source}:${report.id}`;

    // Add all original reports to the map
    original.reports.forEach(report => {
        reportMap.set(getReportKey(report), report);
    });

    // Merge in update reports
    update.reports.forEach(updateReport => {
        const key = getReportKey(updateReport);
        const existingReport = reportMap.get(key);

        if (existingReport) {
            // Merge missing assets arrays, removing duplicates
            const mergedAssets = Array.from(new Set([
                ...existingReport.missingAssets,
                ...updateReport.missingAssets
            ]));
            
            reportMap.set(key, {
                ...existingReport,
                missingAssets: mergedAssets
            });
        } else {
            // Add new report
            reportMap.set(key, updateReport);
        }
    });

    // Convert map back to array
    return {
        reports: Array.from(reportMap.values())
    };
}