# Dependency Rules Summary

See `dependency-rules.md` for the full rules. This is a short reference for developers.

- Pages → Domains → Core → Infrastructure (via adapters)
- Production consumes domain contracts; it does not mutate domain data directly.
