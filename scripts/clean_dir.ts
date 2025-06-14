import { notesDir, outputCuratedFile, outputOfficialFile, processDirectory } from './build_games.js';
import { curatedDir, officialDir } from './build_games.js';
import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import fs from 'fs';

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

    console.log(fs.readFileSync(outputOfficialFile));
    console.log(fs.readFileSync(outputCuratedFile));

    console.log(`Cleaned up ${officialDir}, ${curatedDir}, and ${notesDir} directories`); 
    
} else {
    console.log('Deleting the directories is of destructive nature, and should not be run outside of a CI environment during the build step. Skipping.');
}
