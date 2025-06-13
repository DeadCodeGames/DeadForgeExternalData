import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import { parse } from 'jsonc-parser';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    console.log('All destructive functions have been disabled.');
}
import fs from 'fs';
import path from 'path';


export const curatedDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
export const officialDir = path.join(__dirname, '../DeadForgeAssets/official/games');
export const notesDir = path.join(__dirname, '../DeadForgeAssets/notes/games');
export const outputCuratedFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
export const outputOfficialFile = path.join(__dirname, '../DeadForgeAssets/official/list.json');
export const outputNotesFile = path.join(__dirname, '../DeadForgeAssets/notes/list.json');


export function processDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.jsonc'))
        .map(file => path.join(dir, file));
}

const curatedFiles = processDirectory(curatedDir);
const officialFiles = processDirectory(curatedDir)
const noteFiles = processDirectory(notesDir);

function combineFiles(files: string[]) {
    return files.flatMap(file => {
        const content = parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(content) ? content : [content];
    });
}

const combinedOfficial = combineFiles(officialFiles);
const combinedCurated = combineFiles(curatedFiles);
const combinedNotes = combineFiles(noteFiles);

fs.writeFileSync(outputOfficialFile, JSON.stringify(combinedOfficial, null, 2));
fs.writeFileSync(outputCuratedFile, JSON.stringify(combinedCurated, null, 2));
fs.writeFileSync(outputNotesFile, JSON.stringify(combinedNotes, null, 2));

console.log(`Combined ${combinedOfficial.length} official game assets into ${outputOfficialFile}`)
console.log(`Combined ${combinedCurated.length} curated game assets into ${outputCuratedFile}`);
console.log(`Combined ${combinedNotes.length} notes into ${outputNotesFile}`);