import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    console.log('All destructive functions have been disabled.');
}
const fs = require('fs');
const path = require('path');


const gamesDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
const notesDir = path.join(__dirname, '../DeadForgeAssets/notes/games');
const outputGameFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
const outputNotesFile = path.join(__dirname, '../DeadForgeAssets/notes/list.json');


function processDirectory(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(dir, file));
}


const gameFiles = processDirectory(gamesDir);
const noteFiles = processDirectory(notesDir);


function combineFiles(files) {
    return files.flatMap(file => {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(content) ? content : [content];
    });
}


const combinedGames = combineFiles(gameFiles);
const combinedNotes = combineFiles(noteFiles);


fs.writeFileSync(outputGameFile, JSON.stringify(combinedGames, null, 2));
fs.writeFileSync(outputNotesFile, JSON.stringify(combinedNotes, null, 2));

if (isGitHubActionsEnvironment()) {
    // Delete all files in both directories
    [...gameFiles, ...noteFiles].forEach(file => {
        fs.unlinkSync(file);
    });

    // Remove both directories
    if (fs.existsSync(gamesDir)) {
        fs.rmdirSync(gamesDir);
    }
    if (fs.existsSync(notesDir)) {
        fs.rmdirSync(notesDir);
    }
} else {
    console.log('Deleting the directories is of destructive nature, and should not be run outside of a CI environment during the build step. Skipping.');
}

console.log(`Combined ${combinedGames.length} games into ${outputGameFile}`);
console.log(`Combined ${combinedNotes.length} notes into ${outputNotesFile}`);
console.log(`Cleaned up ${gamesDir} and ${notesDir} directories`); 