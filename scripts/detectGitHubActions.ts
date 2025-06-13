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

    console.log(isGHFlagTrue, allEnvVarsPresent, isOnGitHubHostedRunner);

    return isGHFlagTrue && allEnvVarsPresent && isOnGitHubHostedRunner;
}
