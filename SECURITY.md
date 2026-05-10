# Security Policy

## Supported Versions

The project is pre-1.0. Security fixes target the current `main` branch.

## Reporting

Please open a private vulnerability report on GitHub if available, or contact the repository owner directly.

## Runtime Safety

OS Probabilities does not evaluate arbitrary expressions from config files. V1 predicates are declarative operators over `ctx.*` and `item.*` paths only.
