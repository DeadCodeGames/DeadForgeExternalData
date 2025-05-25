import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    process.exit(1);
}

import fs from 'fs';
import path from 'path';
import { CuratedGameObject, NoteJSON } from './JSONTypes.js';


function processListFile(sourceFile: string, outputDir: string) {
    if (!fs.existsSync(sourceFile)) {
        console.log(`Source file ${sourceFile} does not exist, skipping...`);
        return 0;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8')) as (CuratedGameObject[] | NoteJSON[]);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process each item
    sourceData.forEach((item: CuratedGameObject | NoteJSON) => {
        // Generate a filename based on the item's identifier
        const itemId = item.matches[0].source + '_' + item.matches[0].id;
        const outputPath = path.join(outputDir, `${itemId}.json`);
        
        // Write the individual files
        fs.writeFileSync(outputPath, JSON.stringify(item, null, 2));
    });

    return sourceData.length;
}


const gamesSourceFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
const notesSourceFile = path.join(__dirname, '../DeadForgeAssets/notes/list.json');
const gamesOutputDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
const notesOutputDir = path.join(__dirname, '../DeadForgeAssets/notes/games');

const gamesCount = processListFile(gamesSourceFile, gamesOutputDir);
const notesCount = processListFile(notesSourceFile, notesOutputDir);

console.log(`Split ${gamesCount} games into individual files in ${gamesOutputDir}`);
console.log(`Split ${notesCount} notes into individual files in ${notesOutputDir}`);