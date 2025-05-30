import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { CuratedGameJSON, CuratedGameObject, NoteJSON, NoteObject, CuratedGameExample, NoteExample } from "./JSONTypes";
import { parse } from 'jsonc-parser';

const curatedGames = readdirSync(path.join(__dirname, "../DeadForgeAssets/curated/games"));
const curatedNotes = readdirSync(path.join(__dirname, "../DeadForgeAssets/notes/games"));

let violations: { entryname: string, path: string, expected: string, actual: string }[] = [];

function processObject(game: any, currentlyIn: any, path = "", entryname: string) {
    if (currentlyIn === undefined) {
        console.error(`Schema missing at ${path}`);
        return;
    }

    let properties = Object.keys(game); const expected = Object.keys(currentlyIn);

    // Step 1: Mark property types with schema keys
    for (let i = 0; i < properties.length; i++) {
        const enumMatch = expected.find(e => e.match(new RegExp(`^Enum\\(${properties[i]}\\)$`)));
        const propertyName = properties[i];
        const value = game[propertyName];

        if (enumMatch && typeof value === currentlyIn?.[enumMatch]?.type) {
            properties[i] = enumMatch;
        } else if (typeof value === "object" && !Array.isArray(value)) {
            const matchingObjSchemaKey = expected.find(e => e.startsWith(`Object(${propertyName}`));
            if (matchingObjSchemaKey) properties[i] = matchingObjSchemaKey;
            else properties[i] = `Object(${propertyName})`;
        } else if (Array.isArray(value)) {
            properties[i] = `Array(${propertyName})`;
        }
    }

    // Step 2: Validate properties
    for (const property of properties) {
        const [_, type, rawName, meta] = property.match(/(Object|Array|Enum)?\(([^,()]+)(?:,([^()]+))?\)/) || [];
        const detypedProperty = rawName || property;
        const value = game[detypedProperty];
        const schema = currentlyIn[property];
        const currentPath = path ? `${path}.${detypedProperty}` : detypedProperty;

        if (type === "Object" && meta?.startsWith("identical=")) {
            const propsToCheck = meta
                .replace("identical=", "")
                .split(";")
                .map(p => p.trim());

            const values = propsToCheck.map(p => value?.[p]);

            const areAllStrings = values.every(v => typeof v === "string");
            const areAllObjects = values.every(v => typeof v === "object" && !Array.isArray(v));

            if (!(areAllStrings || areAllObjects)) {
                console.error(`[${currentPath}] props ${propsToCheck.join(", ")} must be either all strings or all objects`);
                violations.push({
                    entryname,
                    path: currentPath,
                    expected: "matching types (string or object)",
                    actual: propsToCheck.map(p => `${p}: ${typeof value?.[p]}`).join(", ")
                });
                continue;
            }

            if (areAllObjects) {
                // Check same keys
                const [first, ...rest] = values;
                for (const [i, v] of rest.entries()) {
                    const keysA = Object.keys(first).sort();
                    const keysB = Object.keys(v).sort();
                    if (JSON.stringify(keysA) !== JSON.stringify(keysB)) {
                        console.error(`[${currentPath}] ${propsToCheck[0]} and ${propsToCheck[i + 1]} must have identical keys`);
                        violations.push({
                            entryname,
                            path: currentPath,
                            expected: `matching keys in ${propsToCheck[0]} and ${propsToCheck[i + 1]}`,
                            actual: `keys mismatch`
                        });
                    }
                }
            }

            // Continue to recurse into properties normally
            processObject(value, schema, currentPath, entryname);
        } else if (type === "Object") {
            processObject(value, schema, currentPath, entryname);
        } else if (type === "Array") {
            for (let i = 0; i < value.length; i++) {
                processObject(value[i], schema[0], `${currentPath}[${i}]`, entryname);
            }
        } else if (type === "Enum") {
            if (!schema.enum.includes(value)) {
                console.error(`[${currentPath}] has invalid value '${value}', expected one of: ${schema.enum.join(", ")}`);
                violations.push({
                    entryname,
                    path: currentPath,
                    expected: schema.enum.join(", "),
                    actual: value
                });
            }
        } else {
            const expectedType = schema || currentlyIn["*"];
            if (typeof value !== expectedType) {
                console.error(`[${currentPath}] is type ${typeof value}, expected ${expectedType}`);
                violations.push({
                    entryname,
                    path: currentPath,
                    expected: expectedType,
                    actual: typeof value
                });
            }
        }
    }
}


for (const game of curatedGames) {
    console.log(`Checking game ${game}`);
    const gameDataArray = parse(readFileSync(`./DeadForgeAssets/curated/games/${game}`, "utf-8"));
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
    const noteData = parse(readFileSync(`./DeadForgeAssets/notes/games/${note}`, "utf-8"));
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
