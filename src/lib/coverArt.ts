/** Capa padrão oficial Tonelada Elétrica (public/). */
export const DEFAULT_COVER = `${import.meta.env.BASE_URL}capa-tonelada-eletrica600x600.jpg`;

/** Versão menor para thumbs (opcional). */
export const DEFAULT_COVER_SM = `${import.meta.env.BASE_URL}capa-tonelada-eletrica.jpg`;

function readSynchsafe(view: DataView, offset: number) {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

function decodeText(bytes: Uint8Array, encoding: number) {
  try {
    if (encoding === 1 || encoding === 2) {
      return new TextDecoder("utf-16").decode(bytes);
    }
    if (encoding === 3) {
      return new TextDecoder("utf-8").decode(bytes);
    }
    return new TextDecoder("iso-8859-1").decode(bytes);
  } catch {
    return "";
  }
}

function findNullTerminator(bytes: Uint8Array, encoding: number, start: number) {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    }
    return bytes.length;
  }
  const idx = bytes.indexOf(0, start);
  return idx === -1 ? bytes.length : idx;
}

/** Extrai capa embutida (APIC) do ID3v2. */
export async function extractCoverFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (
      bytes.length < 10 ||
      String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== "ID3"
    ) {
      return null;
    }

    const version = bytes[3];
    const tagSize = readSynchsafe(view, 6);
    const tagEnd = Math.min(10 + tagSize, bytes.length);
    let offset = 10;

    // Skip extended header (ID3v2.3/2.4)
    if ((bytes[5] & 0x40) !== 0 && offset + 4 <= tagEnd) {
      const extSize =
        version === 4 ? readSynchsafe(view, offset) : view.getUint32(offset);
      offset += 4 + extSize;
    }

    while (offset + 10 <= tagEnd) {
      const frameId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      if (frameId === "\u0000\u0000\u0000\u0000") break;

      const frameSize =
        version === 4
          ? readSynchsafe(view, offset + 4)
          : view.getUint32(offset + 4);
      const frameStart = offset + 10;
      const frameEnd = frameStart + frameSize;
      if (frameSize <= 0 || frameEnd > tagEnd) break;

      if (frameId === "APIC" || frameId === "PIC") {
        const frame = bytes.subarray(frameStart, frameEnd);
        if (frame.length < 4) break;

        const encoding = frame[0];
        let cursor = 1;
        let mime = "image/jpeg";

        if (frameId === "APIC") {
          const mimeEnd = frame.indexOf(0, cursor);
          if (mimeEnd === -1) break;
          mime = new TextDecoder("iso-8859-1").decode(frame.subarray(cursor, mimeEnd)) || "image/jpeg";
          cursor = mimeEnd + 1;
          cursor += 1; // picture type
          const descEnd = findNullTerminator(frame, encoding, cursor);
          cursor = descEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
        } else {
          // ID3v2.2 PIC: 3-char image format
          cursor = 4;
          cursor += 1; // picture type
          const descEnd = findNullTerminator(frame, encoding, cursor);
          cursor = descEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
          void decodeText;
        }

        if (cursor >= frame.length) break;
        const imageBytes = frame.subarray(cursor);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < imageBytes.length; i += chunk) {
          binary += String.fromCharCode(...imageBytes.subarray(i, i + chunk));
        }
        return `data:${mime};base64,${btoa(binary)}`;
      }

      offset = frameEnd;
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveTrackCover(url: string): Promise<string> {
  const embedded = await extractCoverFromUrl(url);
  return embedded || DEFAULT_COVER;
}
