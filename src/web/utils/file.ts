/**
 * 将 File 读取为 Data URL（base64），供图片上传预览 / 上传接口使用。
 */
export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))

    reader.readAsDataURL(file)
  })
