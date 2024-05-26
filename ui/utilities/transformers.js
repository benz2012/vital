export const yearMonthDayString = (year, month, day) =>
  `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

export const transformCatalogFolderData = (folderRow) => {
  return {
    id: folderRow.CatalogFolderId,
    date: yearMonthDayString(folderRow.FolderYear, folderRow.FolderMonth, folderRow.FolderDay),
    year: folderRow.FolderYear,
    month: folderRow.FolderMonth,
    day: folderRow.FolderDay,
    observer: folderRow.ObserverCode,
  }
}

export const sortCatalogFolderData = (original) => {
  return original.toSorted((a, b) => {
    // Date DESC
    if (a.date < b.date) return 1
    if (a.date > b.date) return -1

    // Observer ASC
    if (a.ObserverCode > b.ObserverCode) return 1
    if (a.ObserverCode < b.ObserverCode) return -1
    return 0
  })
}

export const transformVideoData = (videoRow) => {
  return {
    id: videoRow.CatalogVideoId,
    fileName: videoRow.OptimizedFileName,
  }
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
  videoId: linkageRow.CatalogVideoId,
  regionStart: linkageRow.StartTime,
  regionEnd: linkageRow.EndTime,
  annotations: JSON.parse(linkageRow.Annotation),
  thumbnailPartialPath: linkageRow.ThumbnailFilePath,
  sighting: transformSightingData(linkageRow),
})

export const sortLinkageData = (original) => {
  return original.toSorted((a, b) => {
    return 0
  })
}
