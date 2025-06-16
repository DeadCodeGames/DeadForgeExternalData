After weeks of intensive development and internal testing, we're excited to announce the release of DEADFORGE v2.0.0-Beta-2! This release brings some major improvements and introduces our most anticipated feature yet.

We'll be honest with you - **this release is a bit rushed** as we're working against a tight deadline for a school project presentation (as of writing, we need to finish this in the next 2 hours!). However, we're confident that the improvements we've made will significantly enhance the DEADFORGE experience.

As always, please remember that **this is still an experimental Beta release**, and **autoupdate is not yet implemented**. **We'll share the download link once this release is available.**

## 🎉 Major New Feature: DEADFORGE Store Launch!

The feature you've been waiting for is finally here! The **DEADFORGE Store** is now live and ready to use. This is your one-stop destination for all DEADCODE software, accessible directly from DEADFORGE.

To celebrate this launch, we're proud to present our first available game: **[Project DIE](https://deadcode.is-a.dev/DEADFORGE/store/soft/die)** - the very game that served as our main school project and drove us to complete this release on such a tight timeline.

**Game installs are now fully functional** through the DEADFORGE Store, making it easier than ever to discover and install DEADCODE games directly within DEADFORGE.

### A Quick Reality Check About the DEADFORGE Store

Let's be completely honest here - the DEADFORGE Store currently doesn't function as a software distribution platform for everyone like Steam or itch. Let's be real, who in their right mind would want to use this _**abomination**_ as a way to distribute their software? Hell, there isn't even a backend or payment system or dedicated storage server or accounts - this is just a frontend website running on free GitHub Pages hosting with games hosted via GitHub Releases lol.

However, if you're an IRL person we know (like someone from our school), feel free to reach out! You can contact us at **404@mail.deadcode.is-a.dev** and we'll do our best to reply and arrange things. Our agenda isn't that full, I just check that email every blue moon lol.

## 🔧 Technical Improvements

### Enhanced Markdown Support
We've significantly improved our markdown rendering capabilities! DEADFORGE now properly supports headings and lists

### Critical Performance Fixes
We've addressed a major performance bottleneck that was affecting the entire system during Steam library parsing. Previously, our approach was causing significant resource usage spikes across the whole machine due to an inefficient process spawning strategy. More info in the following spoiler.
<spoiler>
**Old approach:**
- 1 process to get initial library info
- 1 additional process for each individual game's path (linear processing)
- This resulted in excessive resource consumption and system-wide slowdowns

**New approach:**
- Implemented smart Map-based caching system
- Dramatically reduced process spawning
- Eliminated per-game process creation
- Significant improvement in parsing speed and system stability
</spoiler>

### User Experience Enhancements
- Various UI improvements for a more polished interface
- Better visual consistency across different sections
- Enhanced responsiveness and smoother interactions

### Simplified Installation
Great news for new users! **The .NET dependency is now bundled directly in the installer**. You no longer need to manually download and install .NET v8.0.16 Runtime - everything you need comes packaged with DEADFORGE.

## ⚠️ Known Limitations

Since this release was developed under tight time constraints, **game update functionality is currently missing**. We prioritized getting the DEADFORGE Store operational and addressing critical performance issues. Game update features will be implemented in future releases.

## 🔮 What's Still Coming

All the features we mentioned in our previous roadmap remain on track:
- Full autoupdate implementation
- Notification system improvements
- Additional storefront support (osu!, HoYoPlay, Riot Client, and more)
- DiscordRPC integration
- Enhanced library management options
- Continued localization efforts

## 🙏 A Note on Feedback

While we don't have a large user base yet, all improvements in this release have been driven by valuable internal feedback from our development team. As our community grows, we're excited to incorporate feedback from actual users to make DEADFORGE even better.

## 🤝 How You Can Help

Your contributions are still welcome and needed:
- Submit feature requests on [DEADFORGE's GitHub Issues](https://github.com/DeadCodeGames/DeadForge/issues)
- Start discussions on [GitHub Discussions](https://github.com/DeadForgeGames/DeadForge/discussions)
- Help with [localization on Crowdin](https://crowdin.com/project/deadforge)
- Try out the new DEADFORGE Store and let us know what you think!

## 🎓 Special Thanks

This release represents a significant milestone not just for DEADFORGE, but for our academic journey as well. The pressure of completing this in time for our school project presentation pushed us to focus on the most impactful improvements, and we believe the result speaks for itself.

With ❤️ and a bit of caffeine-fueled urgency,
[Richard](https://github.com/RichardKanshen), **lead developer of DEADFORGE**.

---

_P.S. - Don't forget to check out [Project DIE](https://deadcode.is-a.dev/DEADFORGE/store/soft/die) in the DEADFORGE Store! 🎮_