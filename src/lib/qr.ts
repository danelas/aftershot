import qrcode from "qrcode-generator";

// QR helpers for the Studio. For a trade business the one interactive element
// that survives cross-posting is a scannable QR — here it deep-links to the
// customer's phone (tap-to-call) since booking happens by call/text.
//
// Both the DOM preview and the canvas export derive from the SAME module matrix
// so what gets placed is what scans in the exported video. `qrcode-generator`
// is pure JS (no Node deps), so it runs in the browser and on the server alike.

/** The URL a customer's QR encodes: tap-to-call their phone. */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/** Dark-module matrix for `text` (error-correction M — survives a little blur). */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M"); // typeNumber 0 = auto-fit the version to the data
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const out: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    out.push(row);
  }
  return out;
}

/** A crisp SVG data URL of the QR (black modules on white) for an <img> in the DOM preview. */
export function qrSvgDataUrl(text: string): string {
  const m = qrModules(text);
  const n = m.length;
  let rects = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) rects += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="#ffffff"/><g fill="#0a0a0c">${rects}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
