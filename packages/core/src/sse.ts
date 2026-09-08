/**
 * Minimal server-sent-events reader for fetch Response bodies. Yields the
 * `data:` payload of each event. Works in browsers, service workers, and node.
 */
export async function* readSse(res: Response): AsyncGenerator<string> {
  if (!res.body) throw new Error('no response body to stream');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = chunk
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (data) yield data;
      }
    }
    if (buf.trim()) {
      const data = buf
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) yield data;
    }
  } finally {
    reader.releaseLock();
  }
}
