import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    process.exit(1);
}

const fs = require('fs');
const path = require('path');

// Read the source file
const sourceData = JSON.parse(fs.readFileSync(path.join(__dirname, '../DeadForgeAssets/curated/list.json'), 'utf8'));

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Process each game
sourceData.forEach((game) => {
    // Generate a filename based on the game's identifier
    const gameId = game.matches[0].source + '_' + game.matches[0].id;
    const outputPath = path.join(outputDir, `${gameId}.json`);
    
    // Write the individual game file
    fs.writeFileSync(outputPath, JSON.stringify(game, null, 2));
});

console.log(`Split ${sourceData.length} games into individual files in ${outputDir}`);