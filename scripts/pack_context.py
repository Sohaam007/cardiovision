#!/usr/bin/env python3
"""Bundle context for pasting into ChatGPT.
Usage: python scripts/pack_context.py [TASK_ID]   -> writes context_bundle.md
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
docs = root / "docs"
parts = [root / "AGENTS.md", docs / "00_CONTEXT.md", docs / "04_API_CONTRACT.md", docs / "STATUS.md"]
if len(sys.argv) > 1:
    card = docs / "tasks" / f"{sys.argv[1]}.md"
    parts.append(card)
    reads = re.findall(r"docs/[\w./-]+\.md", card.read_text())
    parts += [root / r for r in reads]
seen, out = set(), []
for p in parts:
    if p.exists() and p not in seen:
        seen.add(p)
        out.append(f"\n\n===== {p.relative_to(root)} =====\n{p.read_text()}")
(root / "context_bundle.md").write_text("".join(out))
print(f"Wrote context_bundle.md ({len(seen)} files)")
