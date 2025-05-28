import eslintPluginJsonc from 'eslint-plugin-jsonc';
import jsoncParser from 'jsonc-eslint-parser';
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        files: ["DeadForgeAssets/**/*.json"],
        languageOptions: {
            parser: jsoncParser
        },
        plugins: {
            jsonc: eslintPluginJsonc
        },
        rules: {
            "jsonc/auto": "error",
            "jsonc/indent": ["warn", 4],
            "jsonc/quotes": ["error", "double"],
            "jsonc/quote-props": ["error", "always"],
            "jsonc/comma-dangle": ["error", "never"]
        }
    },
    {
        files: ["scripts/**/*.ts"],
        languageOptions: {
            parser: typescriptParser
        },
        plugins: {
            eslintPluginTypescript
        },
        rules: {
            "indent": ["error", 4]
        }
    }
];