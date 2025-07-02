We're back! 🎉 And boy oh boy, do we have some goodies for you. Fresh off our school trip and with school finally over, we're diving headfirst into **DEADFORGE v2.0.0-Beta-3**, I did promise an update for the 1st and I sure did deliver.

> [!NOTE]
> **You can download this release from [our GitHub Releases page](https://github.com/DeadCodeGames/DeadForge/releases/tag/v2.0.0-Beta-3)**.

## 🎮 The Big One: Game Updates Are Here!

Remember how we kept saying "Game update functionality is our #1 missing feature"? Well, guess what - IT'S FINALLY HERE! 🎊

You can now update your games directly within DEADFORGE without having to manually hunt down new versions. No more visiting websites, no more manual downloads, no more "oh wait did I forget to update that one game again?" moments.

But wait, there's more! If we can't locate your currently installed version in the release history (it happens sometimes), we've added a shiny new **"Reinstall" option** that'll give your game a fresh start while doing our best to preserve your precious save data.

## ⏱️ Play Time Tracking

Ever wondered how many hours you've sunk into that one indie game? Wonder no more! We've added detailed play time statistics display for **Total hours played** and **Last played date**.

## 🏠 Home Screen Gets Some Love

You didn’t think we’d leave the home screen looking barren forever, did you? It was due for a layout refresh, so we gave it one!

The home screen now features a **"Jump Back In"** section that shows your recently played games. No more digging through your library just to relaunch what you played yesterday.

![The new Home Screen layout! Yes, we are aware of the bugs here as well. No, you cannot see it from this image (most likely because this very bug). I have fixed this bug before even writing this alt text.](https://deadcode.is-a.dev/DeadForgeExternalData/articles/deadforge-v2-beta-release-3/homescreen.png)

We've also improved article loading with automatic updates, so you'll always see the latest news and updates without having to go back and forth multiple times.

**𝙰𝚗𝚍 𝚢𝚘𝚞, 𝙼𝚛. 𝚂𝚎𝚝𝚝𝚒𝚗𝚐𝚜 𝙿𝚊𝚐𝚎. 𝚆𝚊𝚝𝚌𝚑 𝚢𝚘𝚞𝚛 𝚋𝚊𝚌𝚔.**

## 🚀 Under-the-Hood Improvements

### Better Game Launching
We've made game launching way more reliable with improved detection of when games are actually running (not just pretending to be). Added a "grace period" to prevent accidentally stopping games that are still in their startup phase, plus better support for games that launch additional processes.

### Visual Polish
Better handling of game logos and banners, plus we've fixed some display issues with special characters and emoji. Your library should look crisp and clean!

### Context Menu Fixes
Improved positioning and behavior of pop-up menus - they now behave properly even when you're near screen edges. No more menus disappearing into the void!

## 🐛 The Honest Truth About Bugs

Alright, cards on the table — I promised an update on July 1st, and I really wanted to deliver on that. And I did. But I’ve already spotted a couple of bugs out in the wild.

Nothing game-breaking, but definitely annoying enough to fix ASAP.

Like that image above that may or may not be broken for you. No idea how that slipped through — it worked in testing, I swear.

Or the custom `LOLCAT` flag emoji not showing up everywhere it should. Or... some emojis in general.

The good news? Both of those bugs are already fixed in the code. Just need to wrap up the next release, and we’re good.

## 🌍 Localization Updates

Our translation efforts continue to grow! Here's the current state of affairs:

- 🇸🇰 Slovenčina, 🇨🇿 Čeština - 100%
- 🇯🇵 日本語 - 73%
- 🏴‍☠️ Pirate English - 6%
- 🇨🇳 简体中文 - 5%
- 🇰🇷 한국어, 🇹🇼 繁體中文 - 4%
- 🇫🇷 Français, 🇮🇹 Italiano - 3%
- 🏳️‍🇱‍🇴‍🇱‍‍ LOLCAT, 🇺🇦 Українська мова - 1% _(Ukrainian is NEW!)_
- 🇩🇪 Deutsch - 0% _(this is really embarrassing considering the other languages have above 1% and German does not, solely because I forgot about the `commaSeparator` and `ampersandSeparator`)_

**I'd also like to give a big warm welcome to our possible new Ukrainian translator!** 🇺🇦

**[Join our localization efforts on Crowdin!](https://crowdin.com/project/deadforge)**

## 🔮 What's Coming Next

Now that school's out and we have more time to focus on development, expect more frequent updates! Here's what's brewing:

### Immediate Priorities
- **Bug fixes** - That patch we mentioned is coming very soon
- **Extended tray functionality** - Launch games directly from your system tray
- **More localization push** - Especially looking at you, German speakers 👀 (We have German at school, and still NOBODY touched it lol)

### Slightly Further Out
- Full autoupdate DEADFORGE implementation
- Additional storefront support - osu!, HoYoPlay, Riot Client, and more integrations are on our radar
- DiscordRPC integration for all you status flex enthusiasts 🎮

## 🙏 Thank You (Again!)

Thank you for your patience during our school trip hiatus, and for sticking with us through this rushed-but-exciting update. 

Keep being awesome, and don't forget to update your games now that you actually can! 😄

With ❤️ and way too much excitement about finally shipping game updates,
[Richard](https://github.com/RichardKanshen), **lead developer of DEADFORGE**.

---

_P.S. - Yes, I know about the bugs. Patch incoming. Please don't hate me. 🥺_

_P.P.S. - German translators, we're still waiting for you! 🇩🇪 PLEEEASE **PLEEEEEAS-**_

_P.P.P.S_ - _and uhh happy end of pride month :3 🏳️‍🌈_