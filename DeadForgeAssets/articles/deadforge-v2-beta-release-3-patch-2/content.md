Another quick update coming your way! Yet again, I've noticed some bugs RIGHT AFTER dropping the last update. _sigh._ So uhh, here is what was fixed today.

> [!NOTE]
> **You can download this release from [our GitHub Releases page](https://github.com/DeadCodeGames/DeadForge/releases/tag/v2.0.0-Beta-3-Patch-2)**.

## 🎬 New Features

This patch update includes experimental **video, audio, and embed support** for articles. After this update, you’ll start seeing some more multimedia elements integrated into updates like this — though there still might be some microbugs ([issue reports](https://github.com/DeadCodeGames/DeadForge/issues) appreciated!)

## 🔧 What's Been Fixed

### Game State Detection Issues
We've identified and addressed several bugs related to game state detection that were causing DEADFORGE to sometimes miss when games were launched or closed after DEADFORGE was launched, but not via DEADFORGE. This should make play time tracking much more reliable.
For more technical details, scenarios like:
- Opening a game from Steam, launching DEADFORGE, and then closing the game would previously result in DEADFORGE not knowing the game has been closed.
- Launching DEADFORGE, and opening a game afterwards would result in DEADFORGE not knowing the game is running at all, and possibly fail to attach to the game's process.
We've also slightly changed when the playtime statistics update on your screen altogether. Now, the stats will update immediately after opening/closing the game, rather than after navigating awy and back from the game.

### Language Selector Flag Bug
We've noticed an annoying issue where the flag in the language selector wouldn't update immediately when you changed languages. Previously, you had to navigate away from settings and back again to see the correct flag.
![video:A showcase of the flag bug.](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-2/languageselectorflagstuck.webm)
![On the not so low chance that the video above is not rendering for you because you are on Beta-3-Patch-1 or lower, here is how it looks like](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-2/languageselectorflagstuckframe.jpg)
This patch has fixed this issue.

### Some weird link issues
There were actually _**two**_ issues with links in DEADFORGE.
1. **Within the sidebar** - CTRL-clicking or Shift-clicking any of the links in the sidebar opens them in the browser.
2. **From the Store page** - CTRL-clicking or Shift-clicking any of the links on the Store page opens them in a new DEADFORGE window.
Both of these issues have been addressed in this patch update, with the following behaviour:
1. **Within the sidebar** - CTRL-clicking or Shift-clicking any of the links in the sidebar acts normally, as if the link was clicked without any modifier keys.
2. **From the Store page** - CTRL-clicking or Shift-clicking any of the links on the Store page opens them in the browser.

---

That's just about it for this patch... I think.

As always, thanks for your patience as we continue to improve DEADFORGE! 🚀

With ❤️ and continuous development,
[Richard](https://github.com/RichardKanshen), **lead developer of DEADFORGE**.

---

![3rd update in 3 days. Great fucking job, Richard... awawawawawawa](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3-patch-2/meme.jpg)