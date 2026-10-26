# Hamim Bird

A retro paint-balloon shooter. 50 levels, and a boss named NiNishat after every 5 levels (10 boss fights).

- Normal Hamims walk across the field. They get a little faster each level, then the speed levels off.
- After each boss, some Hamims become advanced: they stay on screen, shoot at your gun and pay bonus currency (সততা).
- Your gun has a health bar. Bosses and advanced Hamims damage it, normal Hamims do not.
- Each boss has a 5 minute timer. If it runs out, the run ends.
- Pause, then open the Market to buy 8 guns and 4 backgrounds. Switching guns has a 3 second cooldown.
- Losing cuts your currency in half and restarts at level 1. Guns and backgrounds are kept.

Created by Wafi ul Karim Chowdhury, Instagram [@wafi_ul_karim_chowdhury2](https://www.instagram.com/wafi_ul_karim_chowdhury2).

## Get the APK and the Windows .exe from GitHub

1. Create a new repository on GitHub.
2. Upload everything in this folder to it, keeping the folder structure. The `.github/workflows` folder must be included, because it holds the build instructions. If you use git:
   ```
   git init
   git add .
   git commit -m "Hamim Bird"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```
3. Open the **Actions** tab. Two workflows start by themselves: **Build Android APK** and **Build Windows EXE**. Each takes a few minutes. You can also start one with **Run workflow**.
4. When a run finishes (green tick), open it and scroll to **Artifacts** at the bottom:
   - `HamimBird-android-apk` contains `app-debug.apk`. Copy it to your phone and open it. Android will ask you to allow installs from unknown sources.
   - `HamimBird-windows-exe` contains `HamimBird-Setup.exe` (installer) and `HamimBird-Portable.exe` (runs without installing).

Windows may show a "protected your PC" warning because the app is not code-signed. Choose **More info**, then **Run anyway**.

## Play it without building

Open `www/index.html` in any browser. It is one self-contained file.

Controls: hold the mouse or your finger to fire, keys 1-8 swap gun, P or Esc pause, M mute.

## Editing the game

The source lives in `src/` (`src/js`, `src/css`, `src/template.html`). After editing, run `python3 tools/build.py` to rebuild `www/index.html`, which is the file the apps use.

## Run the PC version locally

Needs Node.js 18 or newer.

```
npm install
npm start
```

Press F11 for fullscreen. To build the .exe on your own Windows machine: `npm run build:win` (the result is in `dist/`).

## Controls

- Mouse: aim with the cursor, click or hold to fire.
- Touch: tap where you want the balloon to land.
- Keyboard: Space or Enter starts, P or Esc pauses, M mutes.

## Changing the game

- Game code and styling: `src/index.template.html`
- Images: `assets/env.jpg` (field) and `assets/target.png` (target). The untouched originals are in `assets-original/`.
- After editing, run `python3 tools/build.py` to rebuild `www/index.html`. Commit the result so the builds pick it up.

## Notes

- The pixel fonts load from Google Fonts, so they need an internet connection. Offline, the game falls back to a plain monospace font and still works.
- The APK is a debug build, which installs directly without a signing key. A Play Store release needs a signed release build.
- App icons are the defaults. To use your own, add `build/icon.ico` for Windows, and for Android replace the launcher icons in `android/app/src/main/res` after running `npx cap add android` locally.
