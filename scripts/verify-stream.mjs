// Read a small audio range; CDN responses can label M4A files as octet-stream.
export async function verifyStream(value, request = fetch) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        !(url.hostname.endsWith('.kuwo.cn') || url.hostname === 'www.gequhai.com')) return false;
    const result = await request(url, {headers:{Range:'bytes=0-511'},signal:AbortSignal.timeout(12000)});
    if (!result.body) return false;
    const reader = result.body.getReader();
    try {
      if (result.status !== 206 || !/^bytes 0-\d+\/[1-9]\d*$/i.test(result.headers.get('Content-Range') || '')) return false;
      const bytes = new Uint8Array(16);
      let offset = 0;
      while (offset < bytes.length) {
        const part = await reader.read();
        if (part.done) break;
        const chunk = part.value.subarray(0, bytes.length-offset);
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const tag = (start, n) => String.fromCharCode(...bytes.slice(start,start+n));
      return offset >= 12 && (tag(0,3)==='ID3' || tag(4,4)==='ftyp' || tag(0,4)==='fLaC' ||
        tag(0,4)==='OggS' || (tag(0,4)==='RIFF' && tag(8,4)==='WAVE') ||
        (bytes[0]===0xff && (bytes[1]&0xe0)===0xe0));
    } finally { await reader.cancel(); }
  } catch { return false; }
}
