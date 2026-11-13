"""Pack a verified ID inventory into delta-varints. The UI loads this file only for ID lookups."""
import json
import sys
from pathlib import Path
ids=sorted(set(json.loads(Path(sys.argv[1]).read_text())))
if not ids or not all(type(i) is int and 0 < i < 10**12 for i in ids):
    raise SystemExit('invalid song ID inventory')
output=bytearray();previous=0
for item in ids:
    delta=item-previous
    while delta>=128:
        output.append((delta & 127)|128)
        delta >>= 7
    output.append(delta)
    previous=item
target=Path(__file__).resolve().parent.parent/'mobile'/'search-index'/'sitemap.ids'
target.write_bytes(output)
print(len(ids),'unique IDs in',len(output),'bytes')
