import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { CuratedGameJSON, CuratedGameObject, NoteJSON, NoteObject, CuratedGameExample, NoteExample } from "./JSONTypes";

const curatedGames = readdirSync(path.join(__dirname, "../DeadForgeAssets/curated/games"));
const curatedNotes = readdirSync(path.join(__dirname, "../DeadForgeAssets/notes/games"));

let violations: { entryname: string, path: string, expected: string, actual: string }[] = [];

function processObject(game: any, currentlyIn: any, path = "", entryname: string) {
    if (currentlyIn === undefined) {
        console.error(`Schema missing at ${path}`);
        return;
    }

    let properties = Object.keys(game); const expected = Object.keys(currentlyIn)

    // Step 1: Mark property types with their schema keys
    for (let i = 0; i < properties.length; i++) {
        const enumMatch = expected.find(e => e.match(new RegExp(`^Enum\\(${properties[i]}\\)$`)));
        const propertyName = properties[i];
        const value = game[propertyName];

        if (enumMatch && typeof game[propertyName] === currentlyIn?.[enumMatch]?.type) {
            properties[i] = enumMatch;
        } else if (typeof value === "object" && !Array.isArray(value)) {
            properties[i] = `Object(${propertyName})`;
        } else if (Array.isArray(value)) {
            properties[i] = `Array(${propertyName})`;
        } else {
            // leave as-is for flat values
        }
    }

    // Step 2: Validate each property
    for (const property of properties) {
        const detypedProperty = property.replace(/(Object|Array|Enum)\((.*)\)/, "$2");
        const value = game[detypedProperty];
        const schema = currentlyIn[property];
        const currentPath = path ? `${path}.${detypedProperty}` : detypedProperty;

        if (property.startsWith("Object(")) {
            processObject(value, schema, currentPath, entryname);
        } else if (property.startsWith("Array(")) {
            for (let i = 0; i < value.length; i++) {
                processObject(value[i], schema[0], `${currentPath}[${i}]`, entryname);
            }
        } else if (property.startsWith("Enum(")) {
            if (!schema.enum.includes(value)) {
                console.log(path, entryname);
                console.error(`[${currentPath}] has invalid value '${value}', expected one of: ${schema.enum.join(", ")}`);
                violations.push({
                    entryname,
                    path: currentPath,
                    expected: schema.enum.join(", "),
                    actual: value
                })
            }
        } else {
            const expected = schema || currentlyIn["*"];
            if (typeof value !== expected) {
                console.log(path, entryname);
                console.error(`[${currentPath}] is type ${typeof value}, expected ${expected}`);
                violations.push({
                    entryname,
                    path: currentPath,
                    expected: expected,
                    actual: typeof value
                })
            }
        }
    }
}



for (const game of curatedGames) {
    console.log(`Checking game ${game}`);
    const gameDataArray = JSON.parse(readFileSync(`./DeadForgeAssets/curated/games/${game}`, "utf-8"));
    if (Array.isArray(gameDataArray)) {
        for (const gameData of gameDataArray) {
            processObject(gameData, CuratedGameExample, undefined, game);
        }
    } else {
        processObject(gameDataArray, CuratedGameExample, undefined, game);
    }
}

for (const note of curatedNotes) {
    console.log(`Checking note ${note}`);
    const noteData = JSON.parse(readFileSync(`./DeadForgeAssets/notes/games/${note}`, "utf-8"));
    processObject(noteData, NoteExample, undefined, note);
}

if (violations.length > 0) {
    writeFileSync("violations.json", JSON.stringify(violations, null, 2), "utf-8");
    console.log(`::warning::${violations.length} violations found in JSON files`);
    console.log(`echo "violations=${violations.length}" >> $GITHUB_OUTPUT`);
    console.log(`Violations written to violations.json`);
    process.exit(0); // Exit with success so workflow continues
} else {
    console.log('All JSON files validated successfully!');
    console.log(`echo "violations=0" >> $GITHUB_OUTPUT`);
    process.exit(0);
}
