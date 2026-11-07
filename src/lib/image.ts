/** 把上传的封面压缩成较小的 JPEG data URL，避免撑爆 localStorage。 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
      reject(new Error('iPhone 的 HEIC 格式请先转换为 JPG / PNG 再上传'))
      return
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, 600 / img.width, 800 / img.height)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('当前浏览器不支持图片处理')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        let data = canvas.toDataURL('image/jpeg', 0.78)
        if (data.length > 220_000) data = canvas.toDataURL('image/jpeg', 0.6)
        if (data.length > 300_000) data = canvas.toDataURL('image/jpeg', 0.45)
        resolve(data)
      } catch (e) {
        reject(e instanceof Error ? e : new Error('图片处理失败'))
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取这张图片，请换一张 JPG / PNG 试试'))
    }
    img.src = url
  })
}

/** 从备份恢复时只允许图片 data URL 作为封面 */
export function isSafeCover(value?: string): boolean {
  return !!value && value.startsWith('data:image/')
}
