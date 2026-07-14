# Dependency Rules

This document defines mandatory repository dependency directions for Repdox.

## Allowed dependency flow

- `pages` → `domains` / `production` / `core` / `shared`
- `domains` → `core` / `shared`
- `production` → `core` / `shared`
- `core` → `shared`
- `domains` / `production` → `infrastructure` only through public contracts or adapters

## Disallowed dependencies

- `pages` → `infrastructure`
- `pages` → `integrations`
- `pages` → `supabase`
- `pages` → `media` / `MediaMTX` / `RunPod`
- `production` → event mutations or domain data writes
- `domain A` → `domain B` unless through public contracts or API adapters
- `core` → `domains`
- `infrastructure` → `pages`
- `infrastructure` → `domains` / `production`

## Key rules

- Domain modules own their public contracts.
- Production consumes domain state but does not own event domain data.
- Core provides shared cross-cutting concerns only.
- Infrastructure is a runtime concern and should be accessed through adapters.
