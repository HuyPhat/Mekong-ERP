import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

// Just enough of a ZIP reader to open a downloaded .xlsx from a spec, so the
// suite checks the bytes the browser really produced without a dependency.
// Handles stored and deflated entries of a non-ZIP64 archive.
export function unzip(buffer: Buffer): Record<string, Buffer> {
  // The end-of-central-directory record (signature 0x06054b50) is the last 22+ bytes.
  let end = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('Not a ZIP archive');

  const entryCount = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files: Record<string, Buffer> = {};

  for (let n = 0; n < entryCount; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt central directory');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    // The local header repeats the name/extra lengths, which can differ from the central copy.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    files[name] = method === 0 ? Buffer.from(data) : inflateRawSync(data);

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** Reads a downloaded .xlsx and returns each part of the package as text. */
export async function readXlsxParts(path: string): Promise<Record<string, string>> {
  const parts: Record<string, string> = {};
  for (const [name, data] of Object.entries(unzip(await readFile(path)))) {
    parts[name] = data.toString('utf8');
  }
  return parts;
}
