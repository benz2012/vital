const ROOT_FOLDER = '__ROOT__'

const IMAGE_QUALITIES = {
  20: {
    compressionAmount: 'High',
    fileSize: 'Small',
    compressionRatio: 0.03,
    bitsPerPixel: 0.17,
  },
  50: {
    compressionAmount: 'Medium',
    fileSize: 'Medium',
    compressionRatio: 0.05,
    bitsPerPixel: 0.4,
  },
  90: {
    compressionAmount: 'Low',
    fileSize: 'Large',
    compressionRatio: 0.25,
    bitsPerPixel: 2.0,
  },
  100: {
    compressionAmount: 'No',
    fileSize: 'Largest',
    compressionRatio: 1.0,
    bitsPerPixel: null,
  },
}

const BUCKET_THRESHOLDS = {
  small: 0,
  medium: 9_000_000,
  large: 36_000_000,
}

const HISTOGRAM_THRESHOLDS = [
  0, // 0 B - 0.99 MB
  1 * 1024 * 1024, // 1 MB - 3.99 MB
  4 * 1024 * 1024, // 4 MB - 6.99 MB
  7 * 1024 * 1024, // 7 MB +
]

export { ROOT_FOLDER, IMAGE_QUALITIES, BUCKET_THRESHOLDS, HISTOGRAM_THRESHOLDS }
export default {
  EXCEL: 'excel',
  FOLDER: 'folder',
  FILE: 'file',
}
