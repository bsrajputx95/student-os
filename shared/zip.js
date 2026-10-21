const encoder = new TextEncoder();
const table = Array.from({
  length: 256
}, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1;
  return n >>> 0;
});
function crc(bytes) {
  let n = 0xffffffff;
  for (const b of bytes) n = table[(n ^ b) & 255] ^ n >>> 8;
  return (n ^ 0xffffffff) >>> 0;
}
function header(length) {
  const bytes = new Uint8Array(length);
  return {
    bytes,
    view: new DataView(bytes.buffer)
  };
}
export function zipFiles(files) {
  const parts = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path),
      data = encoder.encode(content),
      sum = crc(data),
      h = header(30);
    h.view.setUint32(0, 0x04034b50, true);
    h.view.setUint16(4, 20, true);
    h.view.setUint16(6, 0x800, true);
    h.view.setUint16(12, 0x21, true);
    h.view.setUint32(14, sum, true);
    h.view.setUint32(18, data.length, true);
    h.view.setUint32(22, data.length, true);
    h.view.setUint16(26, name.length, true);
    parts.push(h.bytes, name, data);
    const c = header(46);
    c.view.setUint32(0, 0x02014b50, true);
    c.view.setUint16(4, 20, true);
    c.view.setUint16(6, 20, true);
    c.view.setUint16(8, 0x800, true);
    c.view.setUint16(14, 0x21, true);
    c.view.setUint32(16, sum, true);
    c.view.setUint32(20, data.length, true);
    c.view.setUint32(24, data.length, true);
    c.view.setUint16(28, name.length, true);
    c.view.setUint32(42, offset, true);
    central.push(c.bytes, name);
    offset += 30 + name.length + data.length;
    centralSize += 46 + name.length;
  }
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, Object.keys(files).length, true);
  end.view.setUint16(10, Object.keys(files).length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  const all = [...parts, ...central, end.bytes],
    output = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const part of all) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}
