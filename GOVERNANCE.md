# Governance

OS Probabilities is currently maintained by the project owner. The governance model is intentionally small until there are regular external contributors.

## Maintainer Responsibilities

Maintainers are responsible for:

- protecting the deterministic runtime contract
- reviewing schema changes for compatibility
- requiring fixture updates for behavior changes
- keeping the dependency footprint small
- keeping security and release automation healthy
- documenting when the project should not be used

## Compatibility Policy

The `os-probabilities/v1` contract should not change silently. Changes that alter RNG output, seed derivation, fixed-scale decimal math, predicate behavior, modifier behavior, sampling order, or trace shape require one of these:

- a new schema/runtime version
- a clearly documented migration path
- updated deterministic fixtures and release notes

## Contribution Decision Rules

A feature is a good fit when it makes probability policy easier to validate, simulate, explain, execute, or port. A feature is a poor fit when it turns the project into a hosted flag platform, a gambling compliance product, a cryptographic RNG package, or a large rules engine.

## Maintainer Access

Repository admin, npm owner, and release permissions should stay limited. Use npm trusted publishing for automated releases and avoid long-lived publish tokens where possible.
