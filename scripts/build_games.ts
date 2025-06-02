import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import { parse } from 'jsonc-parser';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    console.log('All destructive functions have been disabled.');
}
import fs from 'fs';
import path from 'path';


export const gamesDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
export const notesDir = path.join(__dirname, '../DeadForgeAssets/notes/games');
export const outputGameFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
export const outputNotesFile = path.join(__dirname, '../DeadForgeAssets/notes/list.json');


export function processDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.jsonc'))
        .map(file => path.join(dir, file));
}

const gameFiles = processDirectory(gamesDir);
const noteFiles = processDirectory(notesDir);

function combineFiles(files: string[]) {
    return files.flatMap(file => {
        const content = parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(content) ? content : [content];
    });
}


const combinedGames = combineFiles(gameFiles);
const combinedNotes = combineFiles(noteFiles);

fs.writeFileSync(outputGameFile, JSON.stringify(combinedGames, null, 2));
fs.writeFileSync(outputNotesFile, JSON.stringify(combinedNotes, null, 2));

console.log(`Combined ${combinedGames.length} games into ${outputGameFile}`);
console.log(`Combined ${combinedNotes.length} notes into ${outputNotesFile}`);