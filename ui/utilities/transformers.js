import { ROOT_FOLDER } from '../constants/fileTypes'
import STATUSES, { WARNINGS, ERRORS } from '../constants/statuses'
import { joinPath, splitPath, nameNoExt } from './paths'
import { yearMonthDayString } from './strings'

export const transformFolderData = (folderRow) => {
  return {
    id: folderRow.CatalogFolderId,
    date: yearMonthDayString(folderRow.FolderYear, folderRow.FolderMonth, folderRow.FolderDay),
    year: folderRow.FolderYear,
    month: folderRow.FolderMonth,
    day: folderRow.FolderDay,
    observer: folderRow.ObserverCode,
  }
}

export const sortFolderData = (original) => {
  return original.toSorted((a, b) => {
    // Date DESC
    if (a.date < b.date) return 1
    if (a.date > b.date) return -1

    // Observer ASC
    if (a.observer > b.observer) return 1
    if (a.observer < b.observer) return -1
    return 0
  })
}

export const transformVideoData = (videoRow) => {
  return {
    id: videoRow.CatalogVideoId,
    fileName: videoRow.OptimizedFileName,
    frameRate: videoRow.FrameRate,
    folderId: videoRow.CatalogFolderId,
  }
}

export const sortVideoData = (original) => {
  return original.toSorted((a, b) => {
    return a.fileName.localeCompare(b.fileName)
  })
}

export const transformSightingData = (sightingRow) => {
  const timeStr = `${sightingRow.SightingTime}`
  const timeStrLen4 = timeStr.length === 3 ? `0${timeStr}` : timeStr
  return {
    id: sightingRow.SightingId,
    date: yearMonthDayString(
      sightingRow.SightingYear,
      sightingRow.SightingMonth,
      sightingRow.SightingDay
    ),
    year: sightingRow.SightingYear.toString(),
    month: sightingRow.SightingMonth.toString().padStart(2, '0'),
    day: sightingRow.SightingDay.toString().padStart(2, '0'),
    observer: sightingRow.ObserverCode,
    time: sightingRow.SightingTime && `${timeStrLen4.slice(0, 2)}:${timeStrLen4.slice(2, 4)}`,
    letter: sightingRow.SightingLetter,
    egno: sightingRow.FieldEGNo,
  }
}

export const sortSightingData = (original) => {
  return original.toSorted((a, b) => {
    // Date DESC
    if (a.date < b.date) return 1
    if (a.date > b.date) return -1

    // Observer ASC
    if (a.observer > b.observer) return 1
    if (a.observer < b.observer) return -1

    // Letter ASC
    if (a.letter > b.letter) return 1
    if (a.letter < b.letter) return -1
    return 0
  })
}

export const transformLinkageData = (linkageRow) => ({
  id: linkageRow.LinkageId,
  regionStart: parseInt(linkageRow.StartTime, 10),
  regionEnd: parseInt(linkageRow.EndTime, 10),
  annotations: JSON.parse(linkageRow.Annotation),
  thumbnail: linkageRow.ThumbnailFilePath,
  sighting: transformSightingData(linkageRow),
  video: transformVideoData(linkageRow),
})

export const sortLinkageData = (original) => {
  return original.toSorted((a, b) => {
    // Letter ASC
    if (a.sighting.letter > b.sighting.letter) return 1
    if (a.sighting.letter < b.sighting.letter) return -1

    // Video ASC
    if (a.video.id > b.video.id) return 1
    if (a.video.id < b.video.id) return -1

    // Region Start Time ASC
    if (a.regionStart > b.regionStart) return 1
    if (a.regionStart < b.regionStart) return -1

    return 0
  })
}

export const regionDataForLinkage = (linkage) => ({
  id: linkage.id,
  letter: linkage.sighting.letter,
  start: linkage.regionStart,
  end: linkage.regionEnd,
})

export const calculateStatus = (errors, warnings) => {
  if (errors.length > 0) {
    return STATUSES.ERROR
  } else if (warnings.length > 0) {
    return STATUSES.WARNING
  }
  return STATUSES.SUCCESS
}

export const transformMediaMetadata = (media) => {
  const warnings = media?.validation_status?.warnings || []
  const errors = media?.validation_status?.errors || []
  const status = calculateStatus(errors, warnings)
  const fileName = nameNoExt(media.file_name)
  const extension = media.file_name.replace(`${fileName}.`, '')
  return {
    filePath: media.file_path,
    fileName,
    extension,
    fileSize: media.size,
    resolution: `${media.width}x${media.height}`,
    width: media.width,
    height: media.height,
    numFrames: media.num_frames,
    // WARNING: this is a string, and somehow that hasn't caused issues yet, but it appears as a Number
    //          in some places because I call Math.round() on it which in JS casts to Number
    frameRate: media.frame_rate,
    duration: media.duration,
    warnings: warnings,
    errors: errors,
    status,
  }
}

export const groupMediaMetadataBySubfolder = (sourceFolder, metadata) => {
  const grouped = new Map()
  let totalSize = 0
  const allWarnings = new Map([...WARNINGS.keys()].map((k) => [k, 0]))
  const allErrors = new Map([...ERRORS.keys()].map((k) => [k, 0]))

  metadata.forEach((media) => {
    const pathParts = splitPath(media.filePath)
    const fullParentFolder = joinPath(pathParts.slice(0, -1))

    let parentFolder = fullParentFolder.replace(sourceFolder, '')
    if (parentFolder === '' || parentFolder === '/' || parentFolder === '\\') {
      parentFolder = ROOT_FOLDER
    }
    if (parentFolder.startsWith('/') || parentFolder.startsWith('\\')) {
      parentFolder = parentFolder.slice(1)
    }

    if (!grouped.has(parentFolder)) {
      grouped.set(parentFolder, [])
    }
    grouped.get(parentFolder).push(media)

    // Perform Parse-Wide Aggregations, regardless of group
    totalSize += parseFloat(media.fileSize)
    media.warnings.forEach((w) => {
      allWarnings.set(w, allWarnings.get(w) + 1)
    })
    media.errors.forEach((e) => {
      allErrors.set(e, allErrors.get(e) + 1)
    })
  })

  const statefulGrouping = [...grouped.entries()]
    .map(([subfolder, mediaList]) => {
      // TODO: make these image/video agnostic
      const hasPathError = mediaList.some((m) => m.errors.includes('MEDIA_PATH_ERROR'))
      const hasPathWarning = mediaList.some((m) => m.warnings.includes('MEDIA_PATH_WARNING'))

      let status = STATUSES.SUCCESS
      let statusText = null
      let filteredMediaList = mediaList
      if (hasPathError) {
        status = STATUSES.ERROR
        statusText = ERRORS.get('MEDIA_PATH_ERROR').message
        filteredMediaList = mediaList.map((media) => ({
          ...media,
          errors: media.errors.filter((e) => e !== 'MEDIA_PATH_ERROR'),
        }))
      } else if (hasPathWarning) {
        status = STATUSES.WARNING
        statusText = WARNINGS.get('MEDIA_PATH_WARNING').message
        filteredMediaList = mediaList.map((media) => ({
          ...media,
          warnings: media.warnings.filter((e) => e !== 'MEDIA_PATH_WARNING'),
        }))
      }

      return {
        subfolder,
        status,
        statusText,
        mediaList: filteredMediaList,
      }
    })
    .sort((a, b) => a.subfolder.localeCompare(b.subfolder))

  return { mediaGroups: statefulGrouping, totalSize, allWarnings, allErrors }
}

export const dumbClone = (obj) => JSON.parse(JSON.stringify(obj))

// Used for consistent access to a unique id within each row of a MetadataDisplayTable
export const getRowId = (row) => row.filePath
