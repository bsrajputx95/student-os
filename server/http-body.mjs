export async function readJsonBody(stream, maxBytes = 32000) {
  // Vercel may parse the incoming body before invoking a Node handler.
  if (stream.body !== undefined) {
    const text = Buffer.isBuffer(stream.body) ? stream.body.toString('utf8') : typeof stream.body === 'string' ? stream.body : JSON.stringify(stream.body);
    if (Buffer.byteLength(text) > maxBytes) {
      const error = new Error('This update is too large.');
      error.status = 413;
      throw error;
    }
    return JSON.parse(text || '{}');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) {
      const error = new Error('This update is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
