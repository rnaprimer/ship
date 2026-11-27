import { deflateSync, inflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Encodes 8-bit RGBA pixels as a PNG (no dependencies). */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/**
 * Decodes a non-interlaced PNG (truecolour, truecolour+alpha, greyscale or
 * indexed with tRNS; 8-bit, or 1/2/4-bit indexed) to RGBA. Enough for the
 * sprites pxl writes; not a general-purpose decoder.
 */
export function decodePng(buf: Uint8Array): { width: number; height: number; data: Uint8Array } {
  const b = Buffer.from(buf);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Buffer[] = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const name = b.toString("ascii", pos + 4, pos + 8);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (name === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      interlace = data[12];
    } else if (name === "PLTE") palette = new Uint8Array(data);
    else if (name === "tRNS") trns = new Uint8Array(data);
    else if (name === "IDAT") idat.push(Buffer.from(data));
    else if (name === "IEND") break;
    pos += 12 + len;
  }
  if (interlace) throw new Error("interlaced PNGs are not supported");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error(`unsupported PNG colour type ${type}`);
  if (depth !== 8 && type !== 3) throw new Error(`unsupported bit depth ${depth}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (channels * depth) / 8);
  const stride = Math.ceil((width * channels * depth) / 8);
  const lines = new Uint8Array(height * stride);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const up = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (a + up) >> 1;
      else if (filter === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      out[x] = v & 0xff;
    }
    lines.set(out, y * stride);
    prev = out;
  }
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const row = y * stride;
      if (type === 3) {
        const perByte = 8 / depth;
        const byte = lines[row + Math.floor(x / perByte)];
        const shift = (perByte - 1 - (x % perByte)) * depth;
        const idx = (byte >> shift) & ((1 << depth) - 1);
        data[o] = palette![idx * 3];
        data[o + 1] = palette![idx * 3 + 1];
        data[o + 2] = palette![idx * 3 + 2];
        data[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (type === 6) data.set(lines.subarray(row + x * 4, row + x * 4 + 4), o);
      else if (type === 2) {
        data.set(lines.subarray(row + x * 3, row + x * 3 + 3), o);
        data[o + 3] = 255;
      } else if (type === 4) {
        const g = lines[row + x * 2];
        data.set([g, g, g, lines[row + x * 2 + 1]], o);
      } else {
        const g = lines[row + x];
        data.set([g, g, g, 255], o);
      }
    }
  return { width, height, data };
}
