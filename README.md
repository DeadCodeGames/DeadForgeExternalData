# DeadForge Curated Assets **××**

This repository contains curated game assets for the DeadForge project, including icons, heroes, logos, headers and capsule images for various platforms.

## Assets List

We... do not have an official list of all games with listed assets i am just way too lazy lmao

## Asset Structure

Each game entry contains:
- Platform-specific identifiers (`matches`)
- Media assets (`media`) with both local file paths and remote URLs (hash is added during the build process)
- Logo positioning data where applicable

## Asset Types

The assets are stored similarly to how Steam does it.
- **Icon**: 256x256 game icon
- **Hero**: Library hero/background image
- **Logo**: Game logo with positioning metadata
- **Header**: Library header image
- **Capsule**: Library grid/capsule image

## Logo Positioning

Logos include additional metadata for positioning:
- `pinned_position`: Anchor point (e.g., "BottomLeft", "CenterCenter", "UpperCenter", "BottomCenter") - these are based on Steam's schema. 
- `height_pct`: Height as percentage of container
- `width_pct`: Width as percentage of container