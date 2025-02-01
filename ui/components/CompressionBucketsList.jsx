import { useState, useEffect, Fragment } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import SkipNextIcon from '@mui/icons-material/SkipNext'

import { baseURL } from '../api/config'
import { COMPRESSION_OPTIONS } from '../constants/fileTypes'
import CompressionOption from './CompressionOption'

const CompressionBucketsList = ({
  compressionBuckets,
  setCompressionSelection,
  sampleImages,
  onImagesLoaded,
  incrementSampleImage,
}) => {
  const onImagesLoadedFunc = onImagesLoaded || (() => {})

  const [imagesToLoad, setImagesToLoad] = useState({})
  useEffect(() => {
    setImagesToLoad(Object.fromEntries(sampleImages.map((sample) => [sample.file_name, false])))
  }, [JSON.stringify(sampleImages)])

  useEffect(() => {
    if (
      Object.values(imagesToLoad).length > 0 &&
      Object.values(imagesToLoad).every((loaded) => loaded === true)
    ) {
      onImagesLoadedFunc()
    }
  }, [JSON.stringify(imagesToLoad)])

  return (
    <Box sx={{ paddingTop: 1, paddingBottom: 1 }}>
      {Object.entries(compressionBuckets).map(([bucketKey, bucket], index) => {
        const sampleImagesForBucket = sampleImages.filter(
          (sample) => sample.bucket_name === bucketKey
        )
        const currentSampleImageIndex = bucket.images.findIndex(
          (filePath) => filePath === sampleImagesForBucket[0]?.original_file_path
        )
        const originalSize = bucket.fileSizes.reduce((acc, size) => acc + size, 0)
        const totalNumPixels = bucket.resolutions.reduce(
          (acc, [width, height]) => acc + width * height,
          0
        )
        return (
          <Fragment key={bucketKey}>
            <Box
              sx={{
                fontSize: '20px',
                marginLeft: 1,
                marginTop: index !== 0 ? 1 : 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {bucket.name} Images Bucket
              {bucket.images.length > 0 && (
                <Button
                  size="small"
                  color="tertiary"
                  sx={{ marginLeft: 1, paddingLeft: 0.75, textTransform: 'none' }}
                  onClick={() => incrementSampleImage(bucketKey, currentSampleImageIndex)}
                  disabled={bucket.sampleReloading}
                >
                  {bucket.sampleReloading ? (
                    'Loading...'
                  ) : (
                    <>
                      Try Next Image <SkipNextIcon fontSize="small" />
                    </>
                  )}
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', padding: 1, paddingTop: 0 }}>
              {bucket.images.length === 0 && (
                <Box sx={{ fontStyle: 'italic', color: 'text.disabled' }}>
                  No images in this bucket
                </Box>
              )}
              {sampleImagesForBucket.map((image) => {
                const option = COMPRESSION_OPTIONS[image.jpeg_quality]
                const outputSize =
                  option.bitsPerPixel == null
                    ? originalSize
                    : (option.bitsPerPixel * totalNumPixels) / 8
                const savingsForBucketWithOption = originalSize - outputSize
                return (
                  <CompressionOption
                    key={image.file_name}
                    image={`${baseURL}/ingest/sample/${encodeURIComponent(image.file_name)}`}
                    compression={option.compressionAmount}
                    fileSize={option.fileSize}
                    savings={savingsForBucketWithOption}
                    imageLoaded={() => {
                      setImagesToLoad((prev) => ({ ...prev, [image.file_name]: true }))
                    }}
                    selected={image.jpeg_quality === bucket.selection}
                    onClick={() => setCompressionSelection(bucketKey, image.jpeg_quality)}
                  />
                )
              })}
            </Box>
          </Fragment>
        )
      })}
    </Box>
  )
}

export default CompressionBucketsList
