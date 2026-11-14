# Noma

**A keyboard that learns how you type.**

<p align="center">
  <img src="Noma%20Website/public/media/noma-layers.webp" alt="Concept render, exploded view of the Noma keyboard: keycaps, a plate of magnetic switches, a circuit board with a sensor under every switch, and the aluminium case." width="760">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/stage-prototype-E8590C?style=flat-square" alt="Prototype stage">
  <img src="https://img.shields.io/badge/waitlist-open-555?style=flat-square" alt="Waitlist open">
  <img src="https://img.shields.io/badge/built-in%20public-555?style=flat-square" alt="Built in public">
</p>

Every key knows how far you pressed it, and Noma tunes each one to the way you
type. Fewer missed keys, fewer accidental ones, nothing to set up.

**[Join the waitlist at nomashift.com →](https://nomashift.com)**

## How it works

**Every key, measured.** Ordinary keyboards only know whether a key is down.
Every Noma key carries a small magnet, with a sensor underneath that reads it
the whole way down, not just on or off.

**Tuned to how you type.** Every key starts at the same actuation point. Each
one then settles where you actually press it: a light pinky press on A or P
still counts, and keys you brush by accident get tuned out, key by key.

**It keeps up with you.** You type differently when you're tired, at a new
desk or on new keycaps. A setting you picked once goes stale; Noma keeps
learning, so the tuning follows you.

**Just a keyboard.** Plug it in and type on any computer. It learns on the
board itself. No app, no account, no subscription.

<p align="center">
  <img src="Noma%20Website/public/media/noma-profile.webp" alt="Concept render, side view of the Noma keyboard with keys pressed to different depths." width="640">
</p>

<p align="center"><sub>Images are concept renders, not the finished product. Nothing here is a specification yet.</sub></p>

## Where it stands

Noma is designed by one person, in the open. Every test and every wrong turn
gets shared as it happens. Next up is a working prototype: magnetic switches,
per-key sensing and the self-tuning firmware on a real board.

## In this repo

| Folder | What it is |
|---|---|
| [`Noma Website`](./Noma%20Website) | [nomashift.com](https://nomashift.com): the keyboard site and waitlist, built with Vite and React. |
| [`Noma App`](./Noma%20App) | Where Noma started: a desktop app (Flow + Glide) that turned repeated workflows into one-press actions. Still works; no longer the focus. |
| [`Noma Virtual Device`](./Noma%20Virtual%20Device) | An on-screen stand-in for the app's earlier hardware idea, a small screen with four buttons. |
| [`Noma Device Firmware`](./Noma%20Device%20Firmware) | ESP32 firmware for that earlier module. Written, not yet run on a board. |
| [`Noma Software Prototype`](./Noma%20Software%20Prototype) | An early demo of the app used for user testing. |

The projects share no packages. Anything that has to match across two of
them is copied by hand and noted where it's used.

## Run the site

```bash
cd "Noma Website"
npm install
npm run dev
```
