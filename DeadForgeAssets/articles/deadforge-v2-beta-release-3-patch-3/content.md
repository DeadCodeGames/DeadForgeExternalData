hihi new patch this is the last one for this update i promise

> [!NOTE]
> **You can download this release from [our GitHub Releases page](https://github.com/DeadCodeGames/DeadForge/releases/tag/v2.0.0-Beta-3-Patch-3)**.

## 🔧 What's Changed?

### More Homepage Layout Tweaks
I could try to explain this, but... I'll just let the clip speak for itself.
![video:MY CHILD! IT'S ALIVE!!!](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-3/articlelistscrollshowcase.webm)
YES, THE LAST PLAYED ROW SHRINKS WHEN YOU SCROLL THROUGH THE ARTICLES LIST. I am very, very happy with how this turned out.
The error handling for the articles list has also been improved. The error states for loading and updating articles are now separated from each other, allowing for a much cleaner and more user-friendly experience.
![Error Handling Comparison. Both loading and updating errors grouped together before, only updating error after.](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-3/articleserrorhandlingshowcase.webp)
![Empty Articles List (Loading Error) Showcase](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-3/emptyarticleslistshowcase.png)

### Fixed a bug with 
I haven't noticed this until now, but there were _two_ small bugs with the `GameCard`s sprinkled in throughout the Library and Homepage.
1. A single missing image would result into a fallback state, even though there were more possible allowed images present (and this fallback state even persists after a different image should be loaded).
![video:Bug #1 Showcase](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-3/gamecardbug1showcase.webm)
2. The algorithm for choosing the right image would not handle different locale options correctly, as shown in the following side-by-side showcase:
![Bug #2 Side-By-Side comparison](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-3/gamecardbug2comparison.webp)
Both of these bugs have been fixed.

### Language updates
**こんにちは～！** 100%クラブへようこそ、日本語ちゃん！　Japanese is, as of this update, at 100% completion!
- 🇸🇰 Slovenčina, 🇨🇿 Čeština, 🇯🇵 日本語 - 100%
- 🏴‍☠️ Pirate English - 6%
- 🇨🇳 简体中文 - 5%
- 🇰🇷 한국어, 🇹🇼 繁體中文 - 4%
- 🇫🇷 Français, 🇮🇹 Italiano - 3%
- 🏳️‍🇱‍🇴‍🇱‍‍ LOLCAT, 🇺🇦 Українська мова, 🇩🇪 Deutsch - 1%
We have also updated the 🇬🇧 emoji to use the more sleek 🏳️‍🇪‍🇳‍🇬‍‍ (it might render a bit wrong here in older versions, so make sure to update! ^^), and shortened the shown language title.

## Small note on DEADFORGE's update schedule
After a bit of thought, I have decided, that a new ✨ BIG FEATURE UPDATE ✨ every 2 weeks would be the best idea, both to make sure DEADFORGE is alive, and that I am as well. This should give me enough time to work on features, localization, and touch grass from time to time as well.

---

As always, thanks for your patience as we continue to improve DEADFORGE! 🚀

With ❤️ and continuous development,
[Richard](https://github.com/RichardKanshen), **lead developer of DEADFORGE**.