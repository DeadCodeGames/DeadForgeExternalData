# DeadForge External Assets **××**

This repository contains curated game assets for the DeadForge project, including icons, heroes, logos, headers and capsule images for various platforms.

## External Assets

### Assets List

We... do not have an official list of all games with listed assets i am just way too lazy lmao

### Asset Structure

Each game entry contains:
- Platform-specific identifiers (`matches`)
- Media assets (`media`) with both local file paths and remote URLs (hash is added during the build process)
- Logo positioning data where applicable

### Asset Types

The assets are stored similarly to how Steam does it, and should be of similar dimensions.
- **Icon**: a square game icon
- **Hero**: Library hero/background image
  - Ideal dimensions: 1920×620px ratio
- **Logo**: Game logo with positioning metadata
  - No set ratio requirements, just make sure it looks good in practice
  - Can be an animated WebP (GIFs are not recommended due to low quality)
- **Header**: Library header image
  - Ideal dimensions: 920×430px ratio
- **Capsule**: Library grid/capsule image
  - Ideal dimensions: 600×900px ratio

### Logo Positioning

Logos include additional metadata for positioning:
- `pinned_position`: Anchor point (e.g., "BottomLeft", "CenterCenter", "UpperCenter", "BottomCenter") - these are based on Steam's schema. 
- `height_pct`: Height as percentage of container
- `width_pct`: Width as percentage of container

## Game Notes

Game notes provide important information about specific titles, including:
- Security advisories and warnings
- Compatibility issues
- Special configuration requirements
- General insights and recommendations

Each game entry contains a `matches` array similar to the assets list, as well as a `notes` array with entries containing:
- `type`: Category of the note (`security_warning`, `compatibility_warning`, `content_warning`, or `info`, anything other is treated as `info` and has no extra significance)
- `severity`: Level of importance (`low`, `medium`, `high`, or `none`)
- `title`: Brief summary of the note (can use Markdown formatting)
- `description`: Detailed explanation of the issue or insight (can use Markdown formatting)
- `recommendation`: Optional steps or suggestions to mitigate issues (can use Markdown formatting)

For possible spoilers, we recommend using the `<spoiler>` and `</spoiler>` tags. However, we also recommend providing non-spoiler information and advice.