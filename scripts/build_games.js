import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
if (!isGitHubActionsEnvironment()) {
    console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
    console.log('All destructive functions have been disabled.');
}
const fs = require('fs');
const path = require('path');

// Read all game files from the games directory
const gamesDir = path.join(__dirname, '../DeadForgeAssets/curated/games');
const outputFile = path.join(__dirname, '../DeadForgeAssets/curated/list.json');

// Read all .json files from the games directory
const gameFiles = fs.readdirSync(gamesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(gamesDir, file));

// Combine all games into a single array, handling both single objects and arrays
const combinedGames = gameFiles.flatMap(file => {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    // If the content is an array, return all its elements
    // If it's a single object, wrap it in an array
    return Array.isArray(content) ? content : [content];
});

// Write the combined file
fs.writeFileSync(outputFile, JSON.stringify(combinedGames, null, 2));

if (isGitHubActionsEnvironment()) {
    // Delete all files in the games directory
    gameFiles.forEach(file => {
        fs.unlinkSync(file);
    });

    // Remove the games directory
    fs.rmdirSync(gamesDir);
} else {
    console.log('Deleting the games directory is of destructive nature, and should not be run outside of a CI environment during the build step. Skipping.');
}

console.log(`Combined ${combinedGames.length} games into ${outputFile}`);
console.log(`Cleaned up ${gamesDir} directory`); 