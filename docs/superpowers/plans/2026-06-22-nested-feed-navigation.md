# Nested Feed Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the dashboard navigate into "category" feed items (an `<enclosure>` whose type is `application/rss+xml`, i.e. another RSS feed instead of a video) and back out, instead of trying to play them as video.

**Architecture:** A new pure function `isSubFeed(item)` in `public/clientLogic.mjs` distinguishes category items from playable video items. `public/app.js` keeps an in-memory navigation stack and routes clicks on category cards to `loadFeed(url, { isNavigation: true })` instead of `playItem`, with a "← Back" button to pop the stack. Root-level loads (typed into the form) continue to persist to `localStorage`; navigation into/out of sub-feeds does not.

**Tech Stack:** Same as the existing app — vanilla JS ES modules, Node's built-in `node:test` runner, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-22-nested-feed-navigation-design.md`

See spec doc for full behavior details. Implementation followed the standard task breakdown: `isSubFeed` pure function, back-button markup/styles, wiring navigation into `app.js`, and manual end-to-end verification — each task TDD'd and committed independently.
