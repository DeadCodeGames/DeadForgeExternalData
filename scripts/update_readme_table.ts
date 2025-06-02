import { Octokit } from '@octokit/rest';
import { CuratedGameJSON, CuratedGameObject } from './JSONTypes';
import * as fs from 'fs';
import * as path from 'path';

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

async function getIssuesWithMissingAssets(): Promise<Set<string>> {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        labels: 'missing-assets'
    });

    const missingAssets = new Set<string>();
    for (const issue of issues) {
        // Extract game IDs from issue body or title
        const matches = issue.body?.match(/source:\s*"([^"]+)"\s*,\s*id:\s*"([^"]+)"/g) || [];
        for (const match of matches) {
            const [source, id] = match.split(',').map(part => part.match(/"([^"]+)"/)?.[1] || '');
            missingAssets.add(`${source}/${id}`);
        }
    }

    return missingAssets;
}

function checkAssetStatus(asset: any, isReported: boolean): AssetStatus {
    if (!asset) {
        return { status: isReported ? '❌' : '' };
    }

    if (typeof asset.remoteUrl === 'string') {
        return { status: '✅' };
    } else if (typeof asset.remoteUrl === 'object') {
        const localizations: Record<string, '✅' | '⚠️' | '❌'> = {};
        for (const [lang, url] of Object.entries(asset.remoteUrl)) {
            localizations[lang] = url ? '✅' : '❌';
        }
        return {
            status: Object.values(localizations).some(status => status === '✅') ? '✅' : '❌',
            localizations
        };
    }

    return { status: '⚠️' };
}

function formatLocalizationStatus(status: AssetStatus): string {
    if (!status.localizations) return status.status;

    return Object.entries(status.localizations)
        .map(([lang, stat]) => `${LANGUAGE_EMOJIS[lang]} ${stat}`)
        .join('\n');
}

async function generateAssetTable(): Promise<string> {
    const gamesDataRaw = JSON.parse(fs.readFileSync(path.join('DeadForgeAssets', 'games.json'), 'utf-8')) as CuratedGameJSON;
    const gamesData = Array.isArray(gamesDataRaw) ? gamesDataRaw : [gamesDataRaw];
    const missingAssets = await getIssuesWithMissingAssets();

    let table = '| Game ID | Icon | Logo | Hero | Header | Capsule |\n';
    table += '|----------|------|------|------|--------|----------|\n';

    for (const game of gamesData) {
        const gameId = `${game.matches[0].source}/${game.matches[0].id}`;
        const isReported = missingAssets.has(gameId);

        const status: GameAssetStatus = {
            iconUrl: checkAssetStatus(game.media.iconUrl, isReported),
            logoUrl: checkAssetStatus(game.media.logoUrl, isReported),
            heroUrl: checkAssetStatus(game.media.heroUrl, isReported),
            headerUrl: checkAssetStatus(game.media.headerUrl, isReported),
            capsuleUrl: checkAssetStatus(game.media.capsuleUrl, isReported)
        };

        table += `| ${gameId} | ${formatLocalizationStatus(status.iconUrl!)} | ${formatLocalizationStatus(status.logoUrl!)} | ${formatLocalizationStatus(status.heroUrl!)} | ${formatLocalizationStatus(status.headerUrl!)} | ${formatLocalizationStatus(status.capsuleUrl!)} |\n`;
    }

    return table;
}

async function updateReadmeTable(): Promise<void> {
    const readmePath = 'README.md';
    const readme = fs.readFileSync(readmePath, 'utf-8');
    const table = await generateAssetTable();

    const updatedReadme = readme.replace(
        /<!------------------------------- ASSETS_LIST_START -------------------------------->([\s\S]*?)<!-------------------------------- ASSETS_LIST_END --------------------------------->/,
        `<!------------------------------- ASSETS_LIST_START -------------------------------->\n${table}\n<!-------------------------------- ASSETS_LIST_END --------------------------------->`
    );

    fs.writeFileSync(readmePath, updatedReadme);
}

// Run the script
updateReadmeTable().catch(error => {
    console.error('Error updating README table:', error);
    process.exit(1);
}); 