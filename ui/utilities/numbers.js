import { COMPRESSION_OPTIONS } from '../constants/fileTypes'

export const determineNonOverlappingTracksForRegions = (regions) => {
  const trackForRegion = []
  regions.forEach((region, index) => {
    if (index === 0) {
      trackForRegion.push(0)
      return
    }

    const [thisStart, thisEnd] = region

    const mostRecentZero = trackForRegion.findLastIndex((track) => track === 0)
    regions.slice(mostRecentZero).some((region, index) => {
      const [otherStart, otherEnd] = region
      if (`${otherStart}-${otherEnd}` === `${thisStart}-${thisEnd}`) return false // Skip own region

      if (index === 0 && thisStart > otherEnd) {
        trackForRegion.push(0)
        return true
      }

      if (thisStart <= otherEnd) {
        // This represents an overlap in track 0, iterate until we find a free track
        let trackToCheck = 1
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const mostRecentRegionInTrackIndex = trackForRegion.findLastIndex(
            (track) => track === trackToCheck
          )
          if (mostRecentRegionInTrackIndex === -1) {
            trackForRegion.push(trackToCheck)
            break
          }
          const mostRecentRegionInTrack = regions[mostRecentRegionInTrackIndex]
          const [, mostRecentRegionEnd] = mostRecentRegionInTrack
          if (thisStart <= mostRecentRegionEnd) {
            trackToCheck += 1
          } else {
            trackForRegion.push(trackToCheck)
            break
          }
        }
      }

      return true
    })
  })
  return trackForRegion
}

// a function that checks if two numerical regions overlap
export const doRegionsOverlap = (start1, end1, start2, end2) => {
  return start1 <= end2 && start2 <= end1
}

export const resolutionToTotalPixels = (resolution) => {
  const [width, height] = resolution.split('x')
  return parseInt(width, 10) * parseInt(height, 10)
}

export const megabytes = (n) => n * 1024 ** 2

export const calculateCompressedSizes = (compressionSelection, fileSizes, resolutions) => {
  const choiceBPP = COMPRESSION_OPTIONS[compressionSelection]?.bitsPerPixel
  const compressedSizes = resolutions.map(([width, height], index) => {
    if (choiceBPP == null) {
      return fileSizes[index]
    }
    return (width * height * choiceBPP) / 8
  })
  return compressedSizes
}
