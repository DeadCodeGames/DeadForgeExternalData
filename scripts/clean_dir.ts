import { notesDir, processDirectory } from './build_games.js';
import { gamesDir } from './build_games.js';
import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import fs from 'fs';

const gameFiles = processDirectory(gamesDir);
const noteFiles = processDirectory(notesDir);

if (isGitHubActionsEnvironment()) {
    // Delete all files in both directories
    [...gameFiles, ...noteFiles].forEach(file => {
        fs.unlinkSync(file);
    });

    // Remove both directories
    if (fs.existsSync(gamesDir)) {
        fs.rmSync(gamesDir, { recursive: true, force: true });
    }
    if (fs.existsSync(notesDir)) {
        fs.rmSync(notesDir, { recursive: true, force: true });
    }

    console.log(`Cleaned up ${gamesDir} and ${notesDir} directories`); 
    
} else {
    console.log('Deleting the directories is of destructive nature, and should not be run outside of a CI environment during the build step. Skipping.');
}
