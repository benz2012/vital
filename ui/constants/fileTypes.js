const ROOT_FOLDER = '__ROOT__'

// This list of JPEG qualities needs to match the TranscodeService.JPEG_QUALITIES on the backend
const MAXIMUM_COMPRESSION_OPTION = 100
const COMPRESSION_OPTIONS = {
  20: {
    compressionAmount: 'High',
    fileSize: 'Small',
    bitsPerPixel: 0.17,
  },
  50: {
    compressionAmount: 'Medium',
    fileSize: 'Medium',
    bitsPerPixel: 0.4,
  },
  90: {
    compressionAmount: 'Low',
    fileSize: 'Large',
    bitsPerPixel: 2.0,
  },
  [MAXIMUM_COMPRESSION_OPTION]: {
    compressionAmount: 'No',
    fileSize: 'Largest',
    bitsPerPixel: null,
  },
}

export { ROOT_FOLDER, COMPRESSION_OPTIONS, MAXIMUM_COMPRESSION_OPTION }
export default {
  EXCEL: 'excel',
  FOLDER: 'folder',
  FILE: 'file',
}
