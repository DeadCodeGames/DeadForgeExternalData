import { Octokit } from '@octokit/rest';
import { GitHubContext } from './types';
import { findReportSection, updateOrCreateReportComment, addMissingAssetsLabel } from './reportHandler';
import generateMarkdownReport from './reportParser';
import { handleUpdateCommand } from './updateHandler';

async function main() {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const githubRepo = process.env.GITHUB_REPOSITORY;

    if (!eventPath || !githubRepo) {
        throw new Error('Required environment variables are not set');
    }

    const event = require(eventPath);
    const [owner, repo] = githubRepo.split('/');

    const octokit = new Octokit({
        auth: process.env.SERVICE_BOT_PAT
    });

    const context: GitHubContext = { owner, repo, octokit };

    if (eventName === 'issue_comment') {
        console.log(`Issue #${event.issue.number} comment by ${event.comment.user.login}:`);
        console.log(event.comment.body);

        // Handle update command if present
        await handleUpdateCommand(
            context,
            event.issue.number,
            event.comment.body,
            event.comment.user.login,
            event.issue.user.login
        );
    
        if (event.issue.body) {
            const reportSection = await findReportSection(event.issue.body);
            if (reportSection) {
                await Promise.all([
                    updateOrCreateReportComment(context, event.issue.number, generateMarkdownReport(reportSection.content)),
                    addMissingAssetsLabel(context, event.issue.number)
                ]);
            }
        }
    } else if (eventName === 'issues') {
        console.log(`Issue #${event.issue.number} ${event.action}:`);
        console.log(event.issue.body);
    
        if (event.issue.body) {
            const reportSection = await findReportSection(event.issue.body);
            if (reportSection) {
                await Promise.all([
                    updateOrCreateReportComment(context, event.issue.number, generateMarkdownReport(reportSection.content)),
                    addMissingAssetsLabel(context, event.issue.number)
                ]);
            }
        }
    } else if (eventName === 'push') {
        const { data: issues } = await octokit.issues.listForRepo({
            owner,
            repo,
            state: 'all',
        });

        console.log('All issues:');
        for (const issue of issues) {
            console.log(`\nIssue #${issue.number}:`);
            console.log(issue.body);
      
            if (issue.body) {
                const reportSection = await findReportSection(issue.body);
                if (reportSection) {
                    await Promise.all([
                        updateOrCreateReportComment(context, issue.number, generateMarkdownReport(reportSection.content)),
                        addMissingAssetsLabel(context, issue.number)
                    ]);
                }
            }
        }
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
