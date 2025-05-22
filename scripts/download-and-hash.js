const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const LIST_JSON_PATH = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
const DOWNLOAD_DIR = path.join(__dirname, '../downloaded');
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second delay between retries

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Track failed downloads
let downloadFailures = [];

async function downloadFile(url, retries = 0) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (retries < MAX_RETRIES - 1) {
                console.log(`Failed to download ${url}: ${response.status}. Retrying (${retries + 1}/${MAX_RETRIES})...`);
                await sleep(RETRY_DELAY);
                return downloadFile(url, retries + 1);
            } else {
                console.error(`Failed to download ${url} after ${MAX_RETRIES} attempts`);
                downloadFailures.push(url);
                return null; // Will be handled as a 404 in the calling function
            }
        }
        
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        if (retries < MAX_RETRIES - 1) {
            console.log(`Error downloading ${url}: ${error.message}. Retrying (${retries + 1}/${MAX_RETRIES})...`);
            await sleep(RETRY_DELAY);
            return downloadFile(url, retries + 1);
        } else {
            console.error(`Failed to download ${url} after ${MAX_RETRIES} attempts: ${error.message}`);
            downloadFailures.push(url);
            return null; // Will be handled as a 404 in the calling function
        }
    }
}

// Helper function to calculate MD5 hash of a buffer
function calculateHash(buffer) {
    if (!buffer) return "404"; // Return "404" for failed downloads
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// Helper function to extract filename from URL
function getFilenameFromUrl(url) {
    return path.basename(new URL(url).pathname);
}

// Process a single URL entry
async function processUrlEntry(urlEntry) {
    if (!urlEntry || !urlEntry.remoteUrl) return urlEntry;
    
    // Handle localized entries (objects with language keys)
    if (typeof urlEntry.remoteUrl === 'object') {
        const result = { ...urlEntry };
        for (const [lang, url] of Object.entries(urlEntry.remoteUrl)) {
            try {
                console.log(`Downloading ${url}...`);
                const buffer = await downloadFile(url);
                const hash = calculateHash(buffer);
                
                // Create language-specific hash object if it doesn't exist
                if (!result.hash) result.hash = {};
                result.hash[lang] = hash;
                
                // Save the file if download was successful
                if (buffer) {
                    const filename = getFilenameFromUrl(url);
                    const outputPath = path.join(DOWNLOAD_DIR, `${lang}_${filename}`);
                    await fs.mkdir(path.dirname(outputPath), { recursive: true });
                    await fs.writeFile(outputPath, buffer);
                    console.log(`Downloaded and hashed ${url} -> ${hash}`);
                } else {
                    console.log(`Recording hash as "404" for ${url}`);
                }
            } catch (error) {
                console.error(`Error processing ${url}: ${error.message}`);
                // Create language-specific hash object if it doesn't exist
                if (!result.hash) result.hash = {};
                result.hash[lang] = "404";
                downloadFailures.push(url);
            }
        }
        return result;
    } 
    // Handle standard entries (single URL)
    else {
        try {
            console.log(`Downloading ${urlEntry.remoteUrl}...`);
            const buffer = await downloadFile(urlEntry.remoteUrl);
            const hash = calculateHash(buffer);
            
            // Save the file if download was successful
            if (buffer) {
                const filename = getFilenameFromUrl(urlEntry.remoteUrl);
                const outputPath = path.join(DOWNLOAD_DIR, filename);
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                await fs.writeFile(outputPath, buffer);
                console.log(`Downloaded and hashed ${urlEntry.remoteUrl} -> ${hash}`);
            } else {
                console.log(`Recording hash as "404" for ${urlEntry.remoteUrl}`);
            }
            
            return { ...urlEntry, hash };
        } catch (error) {
            console.error(`Error processing ${urlEntry.remoteUrl}: ${error.message}`);
            downloadFailures.push(urlEntry.remoteUrl);
            return { ...urlEntry, hash: "404" };
        }
    }
}

// Main function
async function main() {
    try {
        // Reset the failure tracking array
        downloadFailures = [];
        
        // Create download directory if it doesn't exist
        await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

        // Read and parse the JSON file
        const data = await fs.readFile(LIST_JSON_PATH, 'utf8');
        const list = JSON.parse(data);

        // Process each entry
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            if (entry.media) {
                console.log(`Processing entry ${i + 1}/${list.length}...`);

                // Process each media type
                for (const [mediaType, urlEntry] of Object.entries(entry.media)) {
                    entry.media[mediaType] = await processUrlEntry(urlEntry);
                }
            }
        }

        // Write updated JSON back to file
        await fs.writeFile(LIST_JSON_PATH, JSON.stringify(list, null, 4), 'utf8');
        console.log('Done! Updated JSON with hash information.');
        
        // Clean up the download directory
        await fs.rmdir(DOWNLOAD_DIR, { recursive: true });
        
        // Write out the failure status for GitHub Actions to read
        if (downloadFailures.length > 0) {
            console.log(`::warning::${downloadFailures.length} images failed to download`);
            console.log(`::set-output name=download_failures::${downloadFailures.length}`);
            // For newer GitHub Actions
            console.log(`echo "download_failures=${downloadFailures.length}" >> $GITHUB_OUTPUT`);
            
            // Write out the list of failures to a file for reference
            const failuresReport = downloadFailures.join('\n');
            await fs.writeFile('download_failures.txt', failuresReport);
            console.log(`Failed URLs written to download_failures.txt`);
            
            // Exit with success (we want the deployment to continue)
            process.exit(0);
        } else {
            console.log('All downloads successful!');
            console.log(`::set-output name=download_failures::0`);
            // For newer GitHub Actions
            console.log(`echo "download_failures=0" >> $GITHUB_OUTPUT`);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 