# Architecture Overview

This document describes the high-level architecture for Repdox Phase 1 preparation.

Goals:

- Preserve existing frontend and backend behavior.
- Create a structured repository skeleton for future modular migration.
- Introduce clear separation between shared libraries, services, platform modules, and integrations.

Key concepts:

- `src/lib/` remains the current transitional layer.
- `src/modules/` is the new domain/module organization for platform capabilities.
- `src/services/` is the new home for service orchestration.
- `src/shared/` holds common types and cross-cutting utilities.
- `src/integrations/` contains third-party integration adapters.
- `src/infrastructure/` captures infrastructure-agnostic platform pieces.
