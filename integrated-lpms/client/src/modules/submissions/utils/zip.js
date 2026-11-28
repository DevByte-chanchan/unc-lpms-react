// A ZIP file from [{ name, bytes }], files stored as they are (no compression: the PDFs it holds are already
// compressed, so this saves a dependency and loses nothing). Names are UTF-8. Answers a Uint8Array.
// ponytail: no ZIP64, so the whole file must stay under 4 GB (a term of learning plans is a few MB).

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export const crc32 = (bytes) => {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// The DOS date and time a ZIP entry carries.
const dosTime = (d) => [(d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()]

export const makeZip = (files, now = new Date()) => {
  const [time, date] = dosTime(now)
  const locals = []
  const centrals = []
  let offset = 0
  for (const { name, bytes } of files) {
    const nameBytes = new TextEncoder().encode(name)
    const crc = crc32(bytes)
    // Shared by the local header (from "version needed") and the central record: version, UTF-8 flag, stored,
    // time, date, CRC, sizes, name length, extra length.
    const common = (v) => {
      v.setUint16(0, 20, true); v.setUint16(2, 0x0800, true); v.setUint16(4, 0, true)
      v.setUint16(6, time, true); v.setUint16(8, date, true); v.setUint32(10, crc, true)
      v.setUint32(14, bytes.length, true); v.setUint32(18, bytes.length, true)
      v.setUint16(22, nameBytes.length, true); v.setUint16(24, 0, true)
    }
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    common(new DataView(local.buffer, 4))
    local.set(nameBytes, 30)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    common(new DataView(central.buffer, 6))
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)

    locals.push(local, bytes)
    centrals.push(central)
    offset += local.length + bytes.length
  }
  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + 22)
  let at = 0
  for (const part of [...locals, ...centrals, end]) { out.set(part, at); at += part.length }
  return out
}

// A file name safe on Windows, made unique within the ZIP: "IT311L.pdf", then "IT311L (2).pdf".
export const uniqueName = (taken, base, ext) => {
  const clean = String(base || 'plan').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'plan'
  let name = `${clean}${ext}`
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${clean} (${n})${ext}`
  taken.add(name.toLowerCase())
  return name
}
