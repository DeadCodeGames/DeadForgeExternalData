import { parse } from 'jsonc-parser';
import { isGitHubActionsEnvironment } from './detectGitHubActions.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OFFICIAL_LIST_JSON_PATH = path.join(__dirname, '../DeadForgeAssets/official/list.json');
const CURATED_LIST_JSON_PATH = path.join(__dirname, '../DeadForgeAssets/curated/list.json');
const DOWNLOAD_DIR = path.join(__dirname, '../downloaded');
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second delay between retries
const ARTICLES_LIST_JSON_PATH = path.join(__dirname, '../DeadForgeAssets/articles/list.json');
const DEADFORGE_ASSETS_PATH = path.join(__dirname, '../DeadForgeAssets');
const LOCAL_ASSET_PREFIX = 'https://deadcode.is-a.dev/DeadForgeExternalData/';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Track failed downloads
let downloadFailures: string[] = [];

async function downloadFile(url: string, retries = 0) {
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
function calculateHash(buffer: Buffer | null) {
    if (!buffer) return "404"; // Return "404" for failed downloads
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// Helper function to extract filename from URL
function getFilenameFromUrl(url: string) {
    return path.basename(new URL(url).pathname);
}

function getLocalAssetPathFromUrl(url) {
    // Remove the prefix and treat as relative to DeadForgeAssets
    return path.join(DEADFORGE_ASSETS_PATH, url.replace(LOCAL_ASSET_PREFIX, ''));
}

function hashLocalFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        return calculateHash(buffer);
    } catch (e) {
        console.error(`Failed to hash local file: ${filePath}`);
        return '404';
    }
}

// Process a single URL entry
async function processUrlEntry(urlEntry: any) {
    if (!urlEntry || !urlEntry.remoteUrl) return urlEntry;
    
    // Handle localized entries (objects with language keys)
    if (typeof urlEntry.remoteUrl === 'object') {
        const result = { ...urlEntry };
        for (const [lang, url] of Object.entries(urlEntry.remoteUrl as Record<string, string>)) {
            try {
                console.log(`Downloading ${url}...`);
                const buffer = await downloadFile(url);
                const hash = calculateHash(buffer);
                

                if (isGitHubActionsEnvironment()) {
                    // Create language-specific hash object if it doesn't exist
                    if (!result.hash) result.hash = {};
                    result.hash[lang] = hash;
                }
                
                // Save the file if download was successful
                if (buffer) {
                    const filename = getFilenameFromUrl(url);
                    const outputPath = path.join(DOWNLOAD_DIR, `${lang}_${filename}`);
                    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                    fs.writeFileSync(outputPath, buffer);
                    console.log(`Downloaded and hashed ${url} -> ${hash}`);
                } else {
                    console.log(`Recording hash as "404" for ${url}`);
                }
            } catch (error) {
                console.error(`Error processing ${url}: ${error.message}`);
                if (isGitHubActionsEnvironment()) {
                    // Create language-specific hash object if it doesn't exist
                    if (!result.hash) result.hash = {};
                    result.hash[lang] = "404";
                }
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
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, buffer);
                console.log(`Downloaded and hashed ${urlEntry.remoteUrl} -> ${hash}`);
            } else {
                console.log(`Recording hash as "404" for ${urlEntry.remoteUrl}`);
            }
            console.log({...urlEntry, hash})
            if (isGitHubActionsEnvironment()) {
                return { ...urlEntry, hash };
            } else {
                return urlEntry;
            }
        } catch (error) {
            console.error(`Error processing ${urlEntry.remoteUrl}: ${error.message}`);
            downloadFailures.push(urlEntry.remoteUrl);
            if (isGitHubActionsEnvironment()) {
                return { ...urlEntry, hash: "404" };
            } else {
                return urlEntry;
            }
        }
    }
}

async function processArticleAssets(articlesList) {
    for (const article of articlesList.articles) {
        // Authors' profile pictures
        if (Array.isArray(article.authors)) {
            for (const author of article.authors) {
                if (author.profilePicture && author.profilePicture.remoteUrl) {
                    const url = author.profilePicture.remoteUrl;
                    if (url.startsWith(LOCAL_ASSET_PREFIX)) {
                        const localPath = getLocalAssetPathFromUrl(url);
                        author.profilePicture.hash = hashLocalFile(localPath);
                    } else {
                        const buffer = await downloadFile(url);
                        author.profilePicture.hash = calculateHash(buffer);
                    }
                }
            }
        }
        // Banner image
        if (article.bannerImage && article.bannerImage.remoteUrl) {
            const url = article.bannerImage.remoteUrl;
            if (url.startsWith(LOCAL_ASSET_PREFIX)) {
                const localPath = getLocalAssetPathFromUrl(url);
                article.bannerImage.hash = hashLocalFile(localPath);
            } else {
                const buffer = await downloadFile(url);
                article.bannerImage.hash = calculateHash(buffer);
            }
        }
        // Content file (always local)
        if (article.content) {
            const contentPath = path.join(DEADFORGE_ASSETS_PATH, 'articles', article.content);
            article.contentHash = hashLocalFile(contentPath);
        }
        // assetsMap (optional)
        if (article.assetsMap && typeof article.assetsMap === 'object') {
            article.assetsMapHashes = {};
            for (const [url, localPathRel] of Object.entries(article.assetsMap)) {
                if (url.startsWith(LOCAL_ASSET_PREFIX)) {
                    const localPath = getLocalAssetPathFromUrl(url);
                    article.assetsMapHashes[url] = hashLocalFile(localPath);
                } else {
                    const buffer = await downloadFile(url);
                    article.assetsMapHashes[url] = calculateHash(buffer);
                }
            }
        }
    }
}

// Main function
async function main() {
    if (!isGitHubActionsEnvironment()) {
        console.log('This script is of destructive nature, and should not be run outside of a CI environment.');
        console.log('All destructive functions have been disabled.')
    }
    try {
        // Reset the failure tracking array
        downloadFailures = [];
        
        // Create download directory if it doesn't exist
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

        // Read and parse the JSON file
        const curatedData = fs.readFileSync(CURATED_LIST_JSON_PATH, 'utf8'), officialData = fs.readFileSync(OFFICIAL_LIST_JSON_PATH, 'utf8');
        const curatedList = parse(curatedData), officialList = parse(officialData);
        // Process articles
        const articlesData = fs.readFileSync(ARTICLES_LIST_JSON_PATH, 'utf8');
        const articlesList = parse(articlesData);
        await processArticleAssets(articlesList);
        fs.writeFileSync(ARTICLES_LIST_JSON_PATH, JSON.stringify(articlesList, null, 4), 'utf8');
        console.log('Done! Updated Articles List JSON with hash information.');
        console.log(`Saved into ${ARTICLES_LIST_JSON_PATH}`);

        // Process each entry
        for (let i = 0; i < curatedList.length; i++) {
            const entry = curatedList[i];
            if (entry.media) {
                console.log(`Processing entry ${i + 1}/${curatedList.length}...`);

                // Process each media type
                for (const [mediaType, urlEntry] of Object.entries(entry.media)) {
                    entry.media[mediaType] = await processUrlEntry(urlEntry);
                }
            }
        }

        console.log(JSON.stringify(curatedList, null, 4))

        // Write updated JSON back to file
        fs.writeFileSync(CURATED_LIST_JSON_PATH, JSON.stringify(curatedList, null, 4), 'utf8');
        console.log('Done! Updated Curated List JSON with hash information.');
        console.log(`Saved into ${CURATED_LIST_JSON_PATH}`)
        console.log(JSON.stringify(curatedList, null, 4))

        // Process each entry
        for (let i = 0; i < officialList.length; i++) {
            const entry = officialList[i];
            if (entry.media) {
                console.log(`Processing entry ${i + 1}/${officialList.length}...`);

                // Process each media type
                for (const [mediaType, urlEntry] of Object.entries(entry.media)) {
                    entry.media[mediaType] = await processUrlEntry(urlEntry);
                }
            }
        }
        console.log(JSON.stringify(officialList, null, 2))

        // Write updated JSON back to file
        fs.writeFileSync(OFFICIAL_LIST_JSON_PATH, JSON.stringify(officialList, null, 4), 'utf8');
        console.log('Done! Updated Official List JSON with hash information.');
        console.log(`Saved into ${OFFICIAL_LIST_JSON_PATH}`)
        console.log(JSON.stringify(officialList, null, 4))
        
        // Clean up the download directory
        fs.rmdirSync(DOWNLOAD_DIR, { recursive: true });
        
        // Write out the failure status for GitHub Actions to read
        if (downloadFailures.length > 0) {
            console.log(`::warning::${downloadFailures.length} images failed to download`);
            console.log(`echo "download_failures=${downloadFailures.length}" >> $GITHUB_OUTPUT`);
            
            // Write out the list of failures to a file for reference
            const failuresReport = downloadFailures.join('\n');
            fs.writeFileSync('download_failures.txt', failuresReport);
            console.log(`Failed URLs written to download_failures.txt`);
            
            // Exit with success (we want the deployment to continue)
            process.exit(0);
        } else {
            console.log('All downloads successful!');
            console.log(`echo "download_failures=0" >> $GITHUB_OUTPUT`);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

await main(); 