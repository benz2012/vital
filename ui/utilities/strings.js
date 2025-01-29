import { timecodeFromFrameNumber } from './video'
import { dateObserverFolderData, leafPath, safeObserverCode } from './paths'

export const yearMonthDayString = (year, month, day) => `${year}-${monthDayString(month, day)}`

export const monthDayString = (month, day) =>
  `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

export const viewSuffixString = (folder) =>
  `${monthDayString(folder.month, folder.day)} ${folder.observer}`

export const regionString = (regionStart, regionEnd, frameRate) => {
  if (regionStart == null && regionEnd == null) return ''

  let regionString = ''
  if (regionStart == null) {
    regionString += 'not set - '
  } else {
    regionString += timecodeFromFrameNumber(regionStart, frameRate)
    regionString += ' - '
  }
  if (regionEnd == null) {
    regionString += 'not set'
  } else {
    regionString += timecodeFromFrameNumber(regionEnd, frameRate)
  }
  return regionString
}

export const catalogFolderString = (folder) =>
  `${yearMonthDayString(folder.year, folder.month, folder.day)}-${folder.observer.replaceAll('/', '-')}`

export const bytesToSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const bytesPower = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  const bytesAtThatPower = bytes / 1024 ** bytesPower
  const bytesString =
    `${Math.round(bytesAtThatPower)}`.length === 1
      ? bytesAtThatPower.toFixed(1)
      : Math.round(bytesAtThatPower)
  return `${bytesString} ${sizes[bytesPower]}`
}

export const secondsToDuration = (seconds) => {
  seconds = parseFloat(seconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  let durationStr = `${remainingSeconds.toString().padStart(2, '0')}s`
  if (minutes > 0) {
    durationStr = `${minutes.toString().padStart(2, '0')}m ${durationStr}`
  }
  if (hours > 0) {
    durationStr = `${hours}h ${durationStr}`
  }
  return durationStr
}

export const twoPrecisionStrNum = (str) => parseFloat(str).toFixed(2)

// NOTE: Make sure this number matches the one used on the backend
export const fileNameGoodLength = (fileName) => fileName.length <= 20

// NOTE: Make sure this method matches the one used on the backend
//       Although, here we will have `name_no_ext` already
export const fileNameGoodWhitespace = (fileName) =>
  (fileName.startsWith(' ') || fileName.endsWith(' ')) === false

export const completionTimeString = (dateStr) => {
  if (dateStr == null) return ''
  const date = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
  })
  const resultStr = formatter.format(date)
  const adjustedStr = resultStr.replace(/(\d{4,5}),\s(\d{1,2}:)/, '$1 @ $2')
  return adjustedStr
}

export const scheduleTimeString = (dateStr) => {
  if (dateStr == null) return ''
  const date = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
  })
  const resultStr = formatter.format(date)
  return resultStr
}

export const titleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

export const jobNameFromData = (dataStr, numTasks) => {
  const data = JSON.parse(dataStr)
  const type = data.media_type
  const observerCode = data.observer_code

  const sourceFolderName = leafPath(data.source_dir) || ''
  const folderData = dateObserverFolderData(sourceFolderName)
  const nameAddendum =
    folderData.observerCode !== safeObserverCode(observerCode) ? ` > ${observerCode}` : ''
  const name = `${sourceFolderName}${nameAddendum}`

  let numTasksStr = `${numTasks} ${type}${numTasks > 1 ? 's' : ''}`
  if (numTasks === 0) {
    // this means that a job is old enough that we've deleted it's task data
    numTasksStr = `${type}s`
  }
  // Note: that is an emdash
  return `${name} — ${numTasksStr}`
}
