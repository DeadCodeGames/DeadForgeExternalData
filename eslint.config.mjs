import eslintPluginJsonc from 'eslint-plugin-jsonc';
import jsoncParser from 'jsonc-eslint-parser';

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
    }
];