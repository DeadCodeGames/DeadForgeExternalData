import { Octokit } from '@octokit/rest';
import { CuratedGameJSON, CuratedGameObject } from './JSONTypes';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { parse } from 'jsonc-parser';
import { findReportSection } from './issuesMissingAssets/reportHandler';

const LANGUAGE_EMOJIS: Record<string, string> = {
    schinese: '🇨🇳',
    tchinese: '🇹🇼',
    latam: '🇲🇽',
    arabic: '🇸🇦',
    bulgarian: '🇧🇬',
    czech: '🇨🇿',
    danish: '🇩🇰',
    dutch: '🇳🇱',
    english: '🇬🇧',
    finnish: '🇫🇮',
    french: '🇫🇷',
    german: '🇩🇪',
    greek: '🇬🇷',
    hungarian: '🇭🇺',
    indonesian: '🇮🇩',
    italian: '🇮🇹',
    japanese: '🇯🇵',
    koreana: '🇰🇷',
    norwegian: '🇳🇴',
    polish: '🇵🇱',
    portuguese: '🇵🇹',
    brazilian: '🇧🇷',
    romanian: '🇷🇴',
    russian: '🇷🇺',
    spanish: '🇪🇸',
    swedish: '🇸🇪',
    thai: '🇹🇭',
    turkish: '🇹🇷',
    ukrainian: '🇺🇦',
    vietnamese: '🇻🇳'
};

interface AssetStatus {
    status: '✅' | '⚠️' | '❌' | '';
    localizations?: Record<string, '✅' | '⚠️' | '❌'>;
}

interface GameAssetStatus {
    iconUrl?: AssetStatus;
    logoUrl?: AssetStatus;
    heroUrl?: AssetStatus;
    headerUrl?: AssetStatus;
    capsuleUrl?: AssetStatus;
}

interface Report {
    source: string;
    id: string | number;
    name: string;
    missingAssets: string[];
}

interface ReportData {
    reports: Report[];
}

interface GameEntry {
    id: string;
    source: string;
    name: string;
    formattedId: string;
    status: GameAssetStatus;
}

interface IssueData {
    missingAssets: string[];
    name: string;
}

async function getIssuesWithMissingAssets(): Promise<Map<string, IssueData>> {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    const [owner, repo] = ["DeadCodeGames", "DeadForgeExternalData"];
    const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        labels: 'missing deadforge assets'
    });

    const missingAssets = new Map<string, IssueData>();
    
    for (const issue of issues) {
        if (!issue.body) continue;
        
        const reportSection = await findReportSection(issue.body);
        if (!reportSection) continue;

        try {
            const reportData: ReportData = parse(reportSection.content);
            for (const report of reportData.reports) {
                const gameId = `${report.source}/${report.id}`;
                const assetUrls = report.missingAssets.map(asset => `${asset}Url`);
                missingAssets.set(gameId, {
                    missingAssets: assetUrls,
                    name: report.name
                });
            }
        } catch (error) {
            console.error(`Error parsing report in issue #${issue.number}:`, error);
            console.error('Report content:', reportSection.content);
        }
    }

    return missingAssets;
}

function getFormattedFileLink(file: string): string {
    const filename = file.split("/").at(-1);
    if (!filename) return file;
    const fileLink = `https://github.com/DeadCodeGames/DeadForgeExternalData/blob/main/${file.split("/").map(part => encodeURIComponent(part)).join("/")}`;
    return `[${filename}](${fileLink})`;
}

function findGameFilename(source: string, id: string): string {
    const files = glob.sync(path.join('DeadForgeAssets', 'curated', 'games', '*.json*'));
    console.log(files);
    
    for (const file of files) {
        const fileContents = parse(fs.readFileSync(file, 'utf-8'));
        if (Array.isArray(fileContents)) {
            if (fileContents.some(g => g.matches.some(m => m.source === source && m.id === id))) {
                return file;
            }
        } else if (typeof fileContents === 'object' && fileContents.matches.some(m => m.source === source && m.id === id)) {
            return file;
        }
    }
    
    return `${source}_${id}.json`;
}

function formatGameId(source: string, id: string): string {
    const filename = findGameFilename(source, id);
    const formattedSource = source.charAt(0).toUpperCase() + source.slice(1);
    return `${getFormattedFileLink(filename)}<br>${formattedSource}<br>${id}`;
}

async function checkAssetStatus(asset: any, missingAssets: string[] | undefined, assetType: string): Promise<AssetStatus> {
    if (!asset) {
        // If the asset doesn't exist and it's in the missing assets list, mark as missing
        return { status: missingAssets?.includes(assetType) ? '❌' : '' };
    }

    console.log(asset, missingAssets, assetType);

    // Check if the asset exists but is reported as missing
    const isReportedMissing = missingAssets?.includes(assetType);

    if (typeof asset.remoteUrl === 'string') {
        const response = await fetch(asset.remoteUrl);
        if (response.status === 200) {
            return { status: '✅' };
        } else {
            return { status: '⚠️' };
        }
    } else if (typeof asset.remoteUrl === 'object') {
        const localizations: Record<string, '✅' | '⚠️' | '❌'> = {};
        for (const [lang, url] of Object.entries(asset.remoteUrl)) {
            // For localized assets, show warning if reported missing
            const response = await fetch(url as string);
            localizations[lang] = response.status === 200 ? '✅' : '⚠️';
        }
        return {
            status: Object.values(localizations).some(status => status === '✅' || status === '⚠️') ? '✅' : '❌',
            localizations
        };
    }

    // If the asset exists but has issues and is reported missing, show warning
    return { status: isReportedMissing ? '❌' : '⚠️' };
}

function formatLocalizationStatus(status: AssetStatus | undefined): string {
    if (!status) return '';
    if (!status.localizations) return status.status;

    return Object.entries(status.localizations)
        .map(([lang, stat]) => `${LANGUAGE_EMOJIS[lang]} ${stat}`)
        .join('<br>');
}

async function generateAssetTable(): Promise<string> {
    const gamesDataRaw = parse(fs.readFileSync(path.join('DeadForgeAssets', 'curated', 'list.json'), 'utf-8')) as CuratedGameJSON;
    const gamesData = Array.isArray(gamesDataRaw) ? gamesDataRaw : [gamesDataRaw];
    const missingAssetsMap = await getIssuesWithMissingAssets();

    // Create a set of all game IDs we need to process
    const allGameIds = new Set<string>();
    
    // Add games from the compiled list
    gamesData.forEach(game => {
        const source = game.matches[0].source;
        const id = game.matches[0].id;
        allGameIds.add(`${source}/${id}`);
    });

    // Add games from issue reports that don't have files yet
    missingAssetsMap.forEach((_, gameId) => {
        allGameIds.add(gameId);
    });

    let table = '| File name / Game name<br>Game Source<br>Game ID | iconUrl | logoUrl | heroUrl | headerUrl | capsuleUrl |\n';
    table += '|:---------:|:------:|:------:|:------:|:--------:|:----------:|\n';

    // Process all games and store them in an array for sorting
    const entries: GameEntry[] = [];

    // Process all games
    for (const gameId of allGameIds) {
        const [source, id] = gameId.split('/');
        const game = gamesData.find(g => 
            g.matches.some(m => m.source === source && m.id === id)
        );
        const issueData = missingAssetsMap.get(gameId);

        // If we have a game file
        if (game) {
            const formattedId = formatGameId(source, id);
            const status: GameAssetStatus = {
                iconUrl: await checkAssetStatus(game.media.iconUrl, issueData?.missingAssets, 'iconUrl'),
                logoUrl: await checkAssetStatus(game.media.logoUrl, issueData?.missingAssets, 'logoUrl'),
                heroUrl: await checkAssetStatus(game.media.heroUrl, issueData?.missingAssets, 'heroUrl'),
                headerUrl: await checkAssetStatus(game.media.headerUrl, issueData?.missingAssets, 'headerUrl'),
                capsuleUrl: await checkAssetStatus(game.media.capsuleUrl, issueData?.missingAssets, 'capsuleUrl')
            };

            // Use game name from issue report if available, otherwise use file name
            const gameName = issueData?.name.replace('|', '\\|') || path.basename(findGameFilename(source, id), '.jsonc').replace('|', '\\|');

            entries.push({
                id,
                source,
                name: gameName,
                formattedId,
                status
            });
        } 
        // If we don't have a game file but it's reported in issues
        else if (issueData) {
            const formattedSource = source.charAt(0).toUpperCase() + source.slice(1);
            
            // Use game name in the formatted ID
            const formattedId = `${issueData.name.replace('|', '\\|')}<br>${formattedSource}<br>${id}`;

            // Create a row with ❌ for all reported missing assets
            const status: GameAssetStatus = {
                iconUrl: { status: issueData.missingAssets.includes('iconUrl') ? '❌' : '' },
                logoUrl: { status: issueData.missingAssets.includes('logoUrl') ? '❌' : '' },
                heroUrl: { status: issueData.missingAssets.includes('heroUrl') ? '❌' : '' },
                headerUrl: { status: issueData.missingAssets.includes('headerUrl') ? '❌' : '' },
                capsuleUrl: { status: issueData.missingAssets.includes('capsuleUrl') ? '❌' : '' }
            };

            entries.push({
                id,
                source,
                name: issueData.name,
                formattedId,
                status
            });
        }
    }

    // Sort entries by game name
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Generate table rows
    const rows = entries.map(entry => 
        `| ${entry.formattedId} | ${formatLocalizationStatus(entry.status.iconUrl)} | ${formatLocalizationStatus(entry.status.logoUrl)} | ${formatLocalizationStatus(entry.status.heroUrl)} | ${formatLocalizationStatus(entry.status.headerUrl)} | ${formatLocalizationStatus(entry.status.capsuleUrl)} |`
    );

    return table + rows.join('\n') + '\n';
}

async function commitChanges(readmePath: string): Promise<void> {
    const octokit = new Octokit({
        auth: process.env.SERVICE_BOT_PAT
    });

    const [owner, repo] = ["DeadCodeGames", "DeadForgeExternalData"];
    const eventName = process.env.GITHUB_EVENT_NAME;
    const sha = process.env.GITHUB_SHA;

    // Get the current commit's tree
    const { data: currentCommit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: sha!
    });

    // Create a new blob with the updated README content
    const content = fs.readFileSync(readmePath, 'utf-8');
    const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content,
        encoding: 'utf-8'
    });

    // Create a new tree with the updated README
    const { data: tree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.tree.sha,
        tree: [{
            path: 'README.md',
            mode: '100644',
            type: 'blob',
            sha: blob.sha
        }]
    });

    if (currentCommit.committer.name === 'deadcodebot') {
        const { data: updatedCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: currentCommit.message,
            tree: tree.sha,
            parents: [currentCommit.parents[0].sha] // Use the parent of the current commit
        });

        await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${process.env.GITHUB_REF_NAME}`,
            sha: updatedCommit.sha,
            force: true
        });
    } else {
        const { data: newCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: 'Update README.md asset table\n\nAutomatically updated by @deadcodebot',
            tree: tree.sha,
            parents: [sha!]
        });

        await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${process.env.GITHUB_REF_NAME}`,
            sha: newCommit.sha
        });
    }
}

async function updateReadmeTable(): Promise<void> {
    const readmePath = 'README.md';
    const readme = fs.readFileSync(readmePath, 'utf-8');
    const table = await generateAssetTable();

    const updatedReadme = readme.replace(
        /<!------------------------------- ASSETS_LIST_START -------------------------------->([\s\S]*?)<!-------------------------------- ASSETS_LIST_END --------------------------------->/,
        `<!------------------------------- ASSETS_LIST_START -------------------------------->\n\n${table}\n<!-------------------------------- ASSETS_LIST_END --------------------------------->`
    ).replace(
        /<!-- TABLE_UPDATE_TIME_START -->([\s\S]*?)<!-- TABLE_UPDATE_TIME_END -->/,
        `<!-- TABLE_UPDATE_TIME_START -->Last updated on <strong>${new Date().toLocaleString("en-GB", {timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short"})}</strong>.<!-- TABLE_UPDATE_TIME_END -->`
    );

    fs.writeFileSync(readmePath, updatedReadme);

    // Commit the changes
    await commitChanges(readmePath);
}

// Run the script
updateReadmeTable().catch(error => {
    console.error('Error updating README table:', error);
    process.exit(1);
});