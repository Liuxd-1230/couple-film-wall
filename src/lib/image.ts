export const maxPhotoUploadBytes = 25 * 1024 * 1024

export async function prepareImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  try {
    const compressed = await compressImage(file)
    if (compressed.size <= maxPhotoUploadBytes) {
      return compressed
    }
  } catch {
    if (file.size > maxPhotoUploadBytes) {
      throw new Error('这张照片暂时无法压缩，而且超过 25MB。请换一张更小的照片再试。')
    }
  }

  if (file.size > maxPhotoUploadBytes) {
    throw new Error('这张照片超过 25MB，请换一张更小的照片再试。')
  }

  return file
}

export function imageFileExtension(file: File) {
  const fromType = file.type.split('/')[1]?.toLowerCase()
  if (fromType === 'jpeg' || fromType === 'jpg') {
    return 'jpg'
  }
  if (fromType === 'png' || fromType === 'webp' || fromType === 'heic' || fromType === 'heif') {
    return fromType
  }

  const fromName = file.name.split('.').pop()?.toLowerCase()
  return fromName && /^[a-z0-9]+$/.test(fromName) ? fromName : 'jpg'
}

export async function compressImage(file: File, maxSide = 1800, quality = 0.84) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  const image = await loadImage(file)
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
  const width = Math.round(image.width * ratio)
  const height = Math.round(image.height * ratio)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器无法处理图片压缩。')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('图片压缩失败。'))
        }
      },
      'image/jpeg',
      quality,
    )
  })

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败。'))
    }
    image.src = url
  })
}
