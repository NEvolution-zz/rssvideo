# RSS Video Dashboard & Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/Express web app that lets a user enter/change an RSS video feed URL, browse the feed's videos in a dashboard grid, and play a selected video inline.

**Architecture:** Express server proxies and normalizes the RSS feed (`GET /api/feed?url=...`) to sidestep CORS, and serves a static vanilla-JS frontend (`/public`) that renders a searchable video grid and an inline `<video>` player with `hls.js` for `.m3u8` streams.

**Tech Stack:** Node.js 18, Express, `fast-xml-parser`, vanilla HTML/CSS/JS, `hls.js` (CDN), Node's built-in `node:test` runner.

**Spec:** `docs/superpowers/specs/2026-06-22-rss-video-dashboard-design.md`

See spec doc for full feed format, architecture, and frontend behavior details. Implementation followed the standard task breakdown: scaffolding, feed normalization service, Express API server, client-side pure logic, frontend markup/styles, frontend application logic, Dockerfile/README, and manual end-to-end verification — each task TDD'd and committed independently.
