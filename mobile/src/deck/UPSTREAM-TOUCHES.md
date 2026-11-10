# Upstream touches

Baseline: upstream `c82839fb7b6` merged with the fork's pad plumbing (decided 2026-11-09).

Everything new lives in `mobile/src/deck/` and `mobile/app/deck/`. Any edit outside those two
folders gets **one appended line** here, in this format:

```
path — reason — task
```

Append only. Never reorder, rewrap or rewrite an existing line: parallel deck branches edit this
file in the same commit as their touch, and appended lines merge without conflict.

