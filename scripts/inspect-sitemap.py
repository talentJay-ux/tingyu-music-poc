"""Read official sitemap entries, without inferring missing songs from numeric IDs."""
import argparse
import gzip
import io
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

def read_map(url):
    parts = urlsplit(url)
    if parts.scheme != 'https' or parts.hostname not in ('gequhai.com', 'www.gequhai.com'):
        raise ValueError('unexpected sitemap host')
    req = urllib.request.Request(url, headers={'User-Agent':'Tingyu-Catalog/1.0', 'Accept':'application/xml,text/xml,*/*'})
    with urllib.request.urlopen(req, timeout=22) as response:
        # Sitemaps can be up to 50 MiB uncompressed.
        raw = response.read(52_428_801)
    if raw[:2] == b'\x1f\x8b':
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
            raw = stream.read(52_428_801)
    if len(raw) > 52_428_800:
        raise ValueError('sitemap exceeds the XML format limit')
    return ET.fromstring(raw)

def inspect(root_url, max_maps):
    pending, seen, songs = [root_url], set(), set()
    entries = titled = 0
    while pending and len(seen) < max_maps:
        url = pending.pop(0)
        if url in seen: continue
        root = read_map(url)
        seen.add(url)
        kind = root.tag.rsplit('}',1)[-1]
        if kind not in ('sitemapindex','urlset'): raise ValueError('response is not a sitemap')
        for entry in root:
            loc = entry.findtext('{*}loc','').strip()
            if not loc: continue
            if kind == 'sitemapindex':
                if loc not in seen and loc not in pending: pending.append(loc)
                continue
            entries += 1
            parsed = urlsplit(loc)
            match = re.fullmatch(r'/play/([1-9]\d{0,11})/?',parsed.path)
            if match and parsed.hostname in ('www.gequhai.com','gequhai.com'):
                songs.add(match.group(1))
                if entry.find('{*}title') is not None: titled += 1
    return dict(maps_read=len(seen),pending_maps=len(pending),entries=entries,unique_song_ids=len(songs),
                rows_with_direct_title=titled,complete_traversal=not pending)

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--max-maps',type=int,default=3)
    args=ap.parse_args()
    print(json.dumps(inspect('https://www.gequhai.com/sitemap.xml',args.max_maps),ensure_ascii=False))
