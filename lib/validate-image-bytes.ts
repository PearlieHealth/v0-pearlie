/**
 * Validate that a file buffer starts with known image magic bytes.
 * Returns true if the buffer matches JPEG, PNG, or WebP signatures.
 */
export function isValidImageMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 4) return false

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true
  }

  // WebP: 52 49 46 46 (RIFF)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return true
  }

  return false
}
