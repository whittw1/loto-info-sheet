// QuickXorHash — the content hash SharePoint / OneDrive for Business report for
// every file (driveItem.file.hashes.quickXorHash). Computing it here lets the
// upload check that SharePoint stored exactly the bytes it was given, not only
// the same number of them.
//
// The algorithm (Microsoft's reference, and libqxh): byte n of the input is
// XORed into a 160-bit register at bit (11 * n) mod 160, wrapping from bit 159
// to bit 0; the 64-bit little-endian input length is then XORed into the last
// 8 of the register's 20 bytes, which are read little-endian and base64-encoded.
// XOR is linear, so bytes whose index is equal mod 160 are folded together
// first and each fold is placed once — the same answer as placing every byte.
//
// The iPad app carries a copy of this function (index.html, qxhCreate); the
// API tests check the two agree.
function qxhCreate() {
  const lanes = new Uint8Array(160);   // XOR of every byte at index ≡ r (mod 160)
  let length = 0;
  return {
    update(bytes) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      let r = length % 160;
      for (let i = 0; i < b.length; i++) {
        lanes[r] ^= b[i];
        if (++r === 160) r = 0;
      }
      length += b.length;
      return this;
    },
    digest() {
      const out = new Uint8Array(20);
      for (let r = 0; r < 160; r++) {
        const v = lanes[r];
        if (!v) continue;
        const bit = (11 * r) % 160, at = bit >> 3, sh = bit & 7;
        out[at] ^= (v << sh) & 0xff;
        if (sh) out[(at + 1) % 20] ^= v >> (8 - sh);
      }
      let n = length;
      for (let i = 0; i < 8; i++) { out[12 + i] ^= n % 256; n = Math.floor(n / 256); }
      return out;
    },
  };
}
function qxhBase64(bytes) {
  const d = qxhCreate().update(bytes).digest();
  return Buffer.from(d).toString('base64');
}

module.exports = { qxhCreate, qxhBase64 };
