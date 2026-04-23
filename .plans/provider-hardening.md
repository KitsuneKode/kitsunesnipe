# Provider Hardening Plan

Status: Planned

Use this plan when improving scraping depth, stream-source inventory, subtitles, quality variants, dub handling, or the workflow for adding a new provider.

## Goal

Turn provider work from "grab the first playable URL" into a repeatable system that:

- inventories all useful stream candidates when possible
- preserves quality, audio, subtitle, and mirror metadata
- surfaces better diagnostics and fallback decisions
- makes new-provider research reproducible and reviewable
- separates research, implementation, and regression follow-up

## Why This Exists

- some providers expose multiple upstream stream sources per episode
- current scraping often stops at the first successful path
- subtitles, quality labels, and dub language support are not modeled consistently
- new-provider work is too easy to do ad hoc and too hard to audit later
- provider drift is inevitable; we need dossier-quality notes and fixtures to recover quickly

## Deliverables

Each provider should eventually have:

- a research dossier capturing knowns, unknowns, screenshots, URL patterns, iframe chains, network findings, and candidate streams
- an implementation handoff that maps findings to repo contracts
- regression fixtures or sample titles that can be revisited when the site changes
- diagnostics conventions for explaining what was discovered and what failed

## Workstreams

### Workstream 1: Intake And Research Workflow

- define the required inputs from the developer for a new provider
- standardize the dossier format
- store research findings in repo docs instead of chat-only memory
- require "dossier first, code second" for new providers and major provider rewrites

See [.docs/provider-intake.md](../.docs/provider-intake.md).

### Workstream 2: Capability Model

- represent whether a provider supports:
  - movie / series / anime
  - multi-source stream inventory
  - quality variants
  - dub / sub language variants
  - subtitle extraction
  - referer or header requirements
  - click activation
  - nested embed chains
- stop treating every provider as if it only returns one opaque stream URL

### Workstream 3: Inventory-First Resolution

- separate "provider inventory extraction" from "final stream resolution"
- capture all candidate mirrors for a title or episode when the provider exposes them
- store enough metadata to rank or filter candidates later
- avoid expensive final resolution prefetch unless it is clearly worth the cost

### Workstream 4: Diagnostics And Reports

- show which research or resolution stage failed
- record what embeds, manifests, and subtitle endpoints were seen
- capture why candidates were accepted or rejected
- generate privacy-safe local reports that help debug provider drift

### Workstream 5: Regression And Drift Response

- define what evidence to keep for each provider so future breakage is faster to diagnose
- maintain sample titles for movies, series, anime, dub, multi-quality, and subtitle cases
- document how to re-run research when a provider changes behavior

### Workstream 6: AllAnime / Ani-CLI Parity Discipline

- treat ani-cli as the canonical reference for AllAnime or AllManga behavior while it remains maintained
- on this machine, use the local checkout at `~/Projects/osc/ani-cli` for parity checks
- when both KitsuneSnipe and ani-cli are broken, isolate the shared upstream break from local integration bugs
- allow temporary local fixes in KitsuneSnipe when upstream is broken, but record:
  - what diverged
  - why the divergence exists
  - how to remove it once upstream parity is restored
- preserve at least one regression case for search, episode lookup, `tobeparsed`, and final source extraction

## Phase Plan

### Phase 0: Workflow Foundations

- add provider-intake docs and templates
- add repo-local agent instructions for provider research
- update AGENTS/docs routing so provider work follows the same playbook

### Phase 1: Research Artifacts

- start storing provider dossiers for high-value or fragile providers
- create a first pass for VidKing inventory research
- define a dossier checklist for screenshots, network traces, and sample titles

### Phase 2: Runtime Modeling

- add a richer internal capability model
- add candidate stream inventory types rather than one winner-only path
- keep stream, subtitle, audio, and quality metadata composable

### Phase 3: Resolver Upgrades

- support ranking and choosing among multiple candidate streams
- support configurable recovery and fallback policy
- improve subtitle and dub selection behavior

### Phase 4: Regression Safety

- attach fixtures and diagnostics expectations to each hardened provider
- document drift response steps and re-research triggers

## Acceptance Criteria

- adding a provider no longer starts with code guessing
- every serious provider change begins with an evidence-backed dossier
- runtime contracts can represent more than one stream candidate
- subtitle, quality, and dub handling are modeled explicitly
- provider drift can be diagnosed from stored research and local reports
