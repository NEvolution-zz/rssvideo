# Grid/Table View Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Grid/Table view toggle to the dashboard so users can switch the video/category listing to a denser table layout, with the choice persisted across reloads.

**Architecture:** A new `<table>` element sits alongside the existing `#video-grid`, hidden by default. `public/app.js` gets a `currentView` state variable, a `setView(view)` function that toggles visibility/persists to `localStorage`, and a new `renderTable(items)` function structurally parallel to the existing `renderGrid(items)` — same per-item click-routing/badge logic, different markup (table rows instead of cards).

**Tech Stack:** Same as the existing app — vanilla JS ES modules, Node's built-in `node:test` runner, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-22-grid-table-view-toggle-design.md`

See spec doc for full behavior details. Implementation followed the standard task breakdown: view toggle markup/styles, wiring view state into `app.js`, and manual end-to-end verification — each task TDD'd and committed independently. The post-review polish pass extracted shared `appendBadges`/`attachItemHandler` helpers used by both `renderGrid` and `renderTable`, and added an explanatory comment for the `.video-grid[hidden]` CSS override.
