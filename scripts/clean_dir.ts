import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import fs from 'fs';
import path from 'path';

const curatedDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
const officialDir = path.join(__dirname, '../DeadForgeAssets/official/games');
const notesDir = path.join(__dirname, '../DeadForgeAssets/notes/games');
const outputCuratedFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
const outputOfficialFile = path.join(__dirname, '../DeadForgeAssets/official/list.json');
const outputNotesFile = path.join(__dirname, '../DeadForgeAssets/notes/list.json');

function processDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.jsonc'))
        .map(file => path.join(dir, file));
}

const officialFiles = processDirectory(officialDir);
const curatedFiles = processDirectory(curatedDir);
const noteFiles = processDirectory(notesDir);

if (isGitHubActionsEnvironment()) {
    [...officialFiles, ...curatedFiles, ...noteFiles].forEach(file => {
        fs.unlinkSync(file);
    });

    if (fs.existsSync(officialDir)) {
        fs.rmSync(officialDir, { recursive: true, force: true });
    }
    if (fs.existsSync(curatedDir)) {
        fs.rmSync(curatedDir, { recursive: true, force: true });
    }
    if (fs.existsSync(notesDir)) {
        fs.rmSync(notesDir, { recursive: true, force: true });
    }

    console.log(fs.readFileSync(outputOfficialFile, 'utf8'));
    console.log(fs.readFileSync(outputCuratedFile, 'utf8'));

    console.log(`Cleaned up ${officialDir}, ${curatedDir}, and ${notesDir} directories`); 
    
} else {
    console.log('Deleting the directories is of destructive nature, and should not be run outside of a CI environment during the build step. Skipping.');
}
