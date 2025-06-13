import { existsSync } from 'fs';

export function isGitHubActionsEnvironment() {
    const env = process.env;

    // Core GitHub-provided environment variables that are always set in Actions
    const requiredEnvVars = [
        'GITHUB_ACTIONS',
        'GITHUB_WORKFLOW',
        'GITHUB_RUN_ID',
        'GITHUB_JOB',
        'GITHUB_REF',
        'GITHUB_SHA',
        'RUNNER_OS'
    ];

    const allEnvVarsPresent = requiredEnvVars.every((v) => env[v]);
    const isGHFlagTrue = env.GITHUB_ACTIONS === 'true';

    // Check for runner file path that exists only on GH-hosted runners
    const isOnGitHubHostedRunner = existsSync('/home/runner/work');

    console.log('GitHub Actions Environment Check:');
    console.log('GITHUB_ACTIONS:', env.GITHUB_ACTIONS);
    console.log('All required env vars present:', allEnvVarsPresent);
    console.log('Is GH flag true:', isGHFlagTrue);
    console.log('Is on GitHub hosted runner:', isOnGitHubHostedRunner);

    // Only require GITHUB_ACTIONS to be true, as this is the most reliable indicator
    return isGHFlagTrue;
}
