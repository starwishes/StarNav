// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  detectImageType,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_BYTES,
  parseImageData,
  readImageDimensions
} from '../../../src/server/services/system/systemAssetImageCodec.js'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const makePng = (width = 100, height = 80) => {
  const buffer = Buffer.alloc(24)
  PNG_SIGNATURE.copy(buffer)
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

const makeJpg = (width = 100, height = 80) => {
  // SOI + SOF0 marker: height at marker+3, width at marker+5
  const buffer = Buffer.alloc(20)
  buffer[0] = 0xff
  buffer[1] = 0xd8
  buffer[2] = 0xff
  buffer[3] = 0xc0 // SOF0
  buffer.writeUInt16BE(11, 4) // segment length
  buffer.writeUInt16BE(height, 7)
  buffer.writeUInt16BE(width, 9)
  return buffer
}

const makeGif = (width = 100, height = 80) => {
  const buffer = Buffer.alloc(10)
  buffer.write('GIF87a', 0, 'ascii')
  buffer.writeUInt16LE(width, 6)
  buffer.writeUInt16LE(height, 8)
  return buffer
}

const makeWebp = (width = 100, height = 80) => {
  const buffer = Buffer.alloc(30)
  buffer.write('RIFF', 0, 'ascii')
  buffer.write('WEBP', 8, 'ascii')
  buffer.write('VP8X', 12, 'ascii')
  buffer.writeUIntLE(width - 1, 24, 3)
  buffer.writeUIntLE(height - 1, 27, 3)
  return buffer
}

const makeIco = (width = 32, height = 32) => {
  const buffer = Buffer.alloc(22)
  buffer[0] = 0x00
  buffer[1] = 0x00
  buffer[2] = 0x01
  buffer[3] = 0x00
  buffer.writeUInt16LE(1, 4) // one image
  buffer[6] = width // 0 means 256
  buffer[7] = height
  return buffer
}

const toDataUri = (buffer, mime) => `data:image/${mime};base64,${buffer.toString('base64')}`

describe('systemAssetImageCodec', () => {
  describe('detectImageType', () => {
    it('sniffs png, jpg, gif, webp and ico signatures', () => {
      expect(detectImageType(makePng())).toBe('png')
      expect(detectImageType(makeJpg())).toBe('jpg')
      expect(detectImageType(makeGif())).toBe('gif')
      expect(detectImageType(makeWebp())).toBe('webp')
      expect(detectImageType(makeIco())).toBe('ico')
    })

    it('returns empty for unknown buffers', () => {
      expect(detectImageType(Buffer.from('hello world'))).toBe('')
      expect(detectImageType(Buffer.alloc(0))).toBe('')
    })
  })

  describe('readImageDimensions', () => {
    it('parses dimensions from png buffers', () => {
      expect(readImageDimensions(makePng(320, 240), 'png')).toEqual({ width: 320, height: 240 })
    })

    it('parses dimensions from gif buffers', () => {
      expect(readImageDimensions(makeGif(64, 48), 'gif')).toEqual({ width: 64, height: 48 })
    })

    it('parses dimensions from webp buffers', () => {
      expect(readImageDimensions(makeWebp(200, 100), 'webp')).toEqual({ width: 200, height: 100 })
    })

    it('parses dimensions from ico buffers', () => {
      expect(readImageDimensions(makeIco(32, 32), 'ico')).toEqual({ width: 32, height: 32 })
    })

    it('returns null for unknown extensions', () => {
      expect(readImageDimensions(makePng(), 'bmp')).toBeNull()
    })

    it('returns null for truncated png buffers', () => {
      expect(readImageDimensions(Buffer.alloc(8), 'png')).toBeNull()
    })
  })

  describe('parseImageData', () => {
    it('parses a valid png data uri', () => {
      const result = parseImageData(toDataUri(makePng(), 'png'), ['png'])
      expect(result.ext).toBe('png')
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
    })

    it('accepts jpeg aliases and normalizes the extension', () => {
      const result = parseImageData(toDataUri(makeJpg(), 'jpeg'), ['jpg'])
      expect(result.ext).toBe('jpg')
    })

    it('rejects non-data-uri payloads', () => {
      expect(() => parseImageData('not a data uri', ['png'])).toThrow('格式不正确')
      expect(() => parseImageData(null, ['png'])).toThrow('格式不正确')
    })

    it('rejects unsupported declared image types', () => {
      expect(() => parseImageData(toDataUri(makePng(), 'bmp'), ['png'])).toThrow('不支持的文件格式')
    })

    it('rejects formats not in the allowed list', () => {
      expect(() => parseImageData(toDataUri(makePng(), 'png'), ['jpg'])).toThrow('不支持的文件格式')
    })

    it('rejects content that does not match the declared type', () => {
      // declare jpg but send a gif buffer (both allowed => mismatch check fires)
      expect(() => parseImageData(toDataUri(makeGif(), 'jpg'), ['jpg', 'gif'])).toThrow(
        '图片内容与声明格式不一致'
      )
    })

    it('rejects buffers that exceed the upload byte cap', () => {
      const oversized = makePng()
      // overwrite trailing area to grow length while keeping signature + dims
      const large = Buffer.concat([oversized, Buffer.alloc(MAX_UPLOAD_BYTES + 1)])
      expect(() => parseImageData(toDataUri(large, 'png'), ['png'])).toThrow('5MB')
    })

    it('rejects images larger than the dimension limit', () => {
      const huge = makePng(MAX_IMAGE_DIMENSION + 1, 10)
      expect(() => parseImageData(toDataUri(huge, 'png'), ['png'])).toThrow('尺寸不能超过')
    })

    it('rejects images exceeding the total pixel cap', () => {
      const wide = makePng(5000, 5000)
      expect(() => parseImageData(toDataUri(wide, 'png'), ['png'])).toThrow('尺寸不能超过')
    })
  })
})
