# Benchmarks

Run local smoke benchmarks with:

```bash
npm run build
npm run benchmark -- --write benchmarks/latest.json
npm run pack:dry
```

Latest local run on Node v22.21.1:

| Operation | Iterations | Elapsed | Throughput |
| --- | ---: | ---: | ---: |
| pick `lootbox.open` | 100,000 | 2,460.190 ms | 40,647 ops/sec |
| explain `lootbox.open` | 10,000 | 262.085 ms | 38,156 ops/sec |
| simulate `lootbox.open` with 1,000 runs | 25 | 613.268 ms | 41 ops/sec |

Latest `npm run pack:dry` package sizes:

| Package | Tarball | Unpacked |
| --- | ---: | ---: |
| `@os-probabilities/core` | 18.4 kB | 83.9 kB |
| `@os-probabilities/schema` | 2.1 kB | 10.4 kB |
| `@os-probabilities/adapters` | 3.4 kB | 13.9 kB |
| `@os-probabilities/cli` | 4.1 kB | 15.3 kB |

The latest machine-readable benchmark output is in [latest.json](latest.json).

These numbers are meant to catch obvious regressions and give adopters an order-of-magnitude signal. They are not a formal performance guarantee.
