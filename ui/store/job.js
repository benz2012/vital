import { create } from 'zustand'
import { closest } from 'fastest-levenshtein'

import { valueSetter } from './utils'
import ROUTES, { JOB_PHASES, JOB_MODES } from '../constants/routes'
import ingestAPI from '../api/ingest'
import observersAPI from '../api/observers'
import { leafPath } from '../utilities/paths'
import useQueueStore from './queue'
import useRootStore from './index'

const initialState = {
  phase: JOB_PHASES.INPUTS,
  sourceFolder: '',
  sourceFolderValid: true,
  numFiles: { images: null, videos: null, error: null },
  observerCode: null,
  jobMode: JOB_MODES.UNSET,
  localOutputFolder: '',
  reportDir: '',
  metadataFilter: null,
  issueIgnoreList: [],
  batchRenameRules: {
    trimStart: 0,
    trimEnd: 0,
    prefix: '',
    suffix: '',
    insertText: '',
    insertAt: 0,
    findString: '',
    replaceString: '',
    applied: true,
  },
  compressionBuckets: {
    small: { images: [], selection: 100, size: 0, sizes: [] },
    medium: { images: [], selection: 100, size: 0, sizes: [] },
    large: { images: [], selection: 100, size: 0, sizes: [] },
  },
  jobId: null,
  jobIdDark: null,
  jobIdDarkSample: null,
  colorCorrectApplied: false,
  settingsList: [],
  observers: [],
}

const validateSourceFolder = (folderPath) => {
  const folderName = leafPath(folderPath)
  // Check for YYYY-MM-DD-ObserverCode
  const matchFound = folderName.match(/^\d{4}-\d{2}-\d{2}-(.+)$/i)
  if (!matchFound) return [false, null]
  return [true, matchFound[1]]
}

const useJobStore = create((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState, observers: get().observers }),

  setPhase: async (nextPhase) => {
    const { jobIdDarkSample } = get()
    set({ phase: nextPhase, jobId: null, jobIdDark: null, jobIdDarkSample: null })
    if (nextPhase === JOB_PHASES.PARSE) {
      get().triggerParse()
    } else if (nextPhase === JOB_PHASES.CHOOSE_OPTIONS) {
      get().triggerSampleImages()
    } else if (nextPhase === JOB_PHASES.EXECUTE) {
      get().triggerExecute(jobIdDarkSample)
    }
  },

  triggerParse: async () => {
    const { sourceFolder, jobMode } = get()
    const jobId = await ingestAPI.parse(jobMode, sourceFolder)
    set({ jobId })
  },

  triggerSampleImages: async (imagesToExclude = []) => {
    const { compressionBuckets } = get()
    let possibleSmallImage = compressionBuckets.small?.images?.[0]
    let possibleMediumImage = compressionBuckets.medium?.images?.[0]
    let possibleLargeImage = compressionBuckets.large?.images?.[0]

    if (possibleSmallImage && imagesToExclude.includes(possibleSmallImage)) {
      compressionBuckets.small?.images?.find((image) => {
        if (!imagesToExclude.includes(image)) {
          possibleSmallImage = image
          return true
        }
        return false
      })
    }
    if (possibleMediumImage && imagesToExclude.includes(possibleMediumImage)) {
      compressionBuckets.medium?.images?.find((image) => {
        if (!imagesToExclude.includes(image)) {
          possibleMediumImage = image
          return true
        }
        return false
      })
    }
    if (possibleLargeImage && imagesToExclude.includes(possibleLargeImage)) {
      compressionBuckets.large?.images?.find((image) => {
        if (!imagesToExclude.includes(image)) {
          possibleLargeImage = image
          return true
        }
        return false
      })
    }

    const jobId = await ingestAPI.createSampleImages(
      possibleSmallImage,
      possibleMediumImage,
      possibleLargeImage
    )
    set({ jobId })
  },

  triggerDarkImagesIdentify: async () => {
    const { compressionBuckets } = get()
    const jobId = await ingestAPI.identifyDarkImages([
      ...(compressionBuckets.small?.images || []),
      ...(compressionBuckets.medium?.images || []),
      ...(compressionBuckets.large?.images || []),
    ])
    set({ jobIdDark: jobId })
  },

  triggerDarkSampleImages: async (filePaths) => {
    const jobId = await ingestAPI.createDarkSampleImages(filePaths)
    set({ jobIdDarkSample: jobId })
  },

  triggerExecute: async (jobIdDarkSample = null) => {
    const { jobMode, sourceFolder, settingsList, localOutputFolder, reportDir, observerCode } =
      get()
    await ingestAPI.transcode(
      sourceFolder,
      settingsList,
      jobMode,
      localOutputFolder,
      reportDir,
      observerCode
    )

    if (jobMode === JOB_MODES.BY_IMAGE) {
      ingestAPI.deleteDarkSampleImages(jobIdDarkSample)
    }

    // After submitting a new job to the queue, Navigate the user back home,
    // reload the queue data, and reset some of the stores like we do in the Navbar
    useQueueStore.getState().fetchJobsData()
    useRootStore.getState().setRoute(ROUTES.TOOLS)
    useRootStore.getState().resetStore()
    get().reset()
    useRootStore.getState().setJobQueueOpen(true)
  },

  setSourceFolder: (sourceFolder) => {
    let isValid = false
    let observerCodeRaw = null
    if (sourceFolder !== '') {
      const validation = validateSourceFolder(sourceFolder)
      isValid = validation[0]
      observerCodeRaw = validation[1]
    }

    let initialObserverCode = null
    if (isValid) {
      initialObserverCode = closest(observerCodeRaw, get().observers)
    }

    set({
      sourceFolder,
      sourceFolderValid: isValid,
      observerCode: initialObserverCode,
    })
  },

  countFiles: async () => {
    const { sourceFolder } = get()
    const numFiles = await ingestAPI.countFiles(sourceFolder)
    set({ numFiles })
  },

  setJobMode: valueSetter(set, 'jobMode'),

  setLocalOutputFolder: valueSetter(set, 'localOutputFolder'),
  setReportDir: valueSetter(set, 'reportDir'),

  setMetadataFilter: valueSetter(set, 'metadataFilter'),
  addToIgnoreList: (newIssue) => {
    const { issueIgnoreList } = get()
    set({ issueIgnoreList: [...issueIgnoreList, newIssue] })
  },
  removeFromIgnoreList: (issueToRemove) => {
    const { issueIgnoreList } = get()
    set({ issueIgnoreList: issueIgnoreList.filter((issue) => issue !== issueToRemove) })
  },

  setOneBatchRenameRule: (key, value) => {
    const { batchRenameRules } = get()
    set({ batchRenameRules: { ...batchRenameRules, applied: false, [key]: value } })
  },
  applyBatchRenameRules: () => {
    const { batchRenameRules } = get()
    set({ batchRenameRules: { ...batchRenameRules, applied: true } })
  },
  invalidateBatchRenameRules: () => {
    const { batchRenameRules } = get()
    set({ batchRenameRules: { ...batchRenameRules, applied: false } })
  },
  processBatchRenameOnString: (string) => {
    if (!string) return string
    const { batchRenameRules } = get()
    const { trimStart, trimEnd, prefix, suffix, insertText, insertAt, findString, replaceString } =
      batchRenameRules
    let newString = string
    if (trimStart > 0) {
      newString = newString.slice(trimStart)
    }
    if (trimEnd > 0) {
      newString = newString.slice(0, -trimEnd)
    }
    if (prefix) {
      newString = `${prefix}${newString}`
    }
    if (suffix) {
      newString = `${newString}${suffix}`
    }
    if (insertText) {
      newString = newString.slice(0, insertAt) + insertText + newString.slice(insertAt)
    }
    if (findString) {
      newString = newString.replaceAll(findString, replaceString)
    }
    return newString
  },

  setCompressionBuckets: valueSetter(set, 'compressionBuckets'),
  setCompressionSelection: (size, quality) => {
    const { compressionBuckets } = get()
    const newBuckets = {
      ...compressionBuckets,
      [size]: {
        ...compressionBuckets[size],
        selection: quality,
      },
    }
    set({ compressionBuckets: newBuckets })
  },

  // This list should be a list of object
  // The schema can be found in the TranscodeSettings class within the server
  setSettingsList: valueSetter(set, 'settingsList'),

  setObserverCode: valueSetter(set, 'observerCode'),
  loadObservers: async () => {
    const observers = await observersAPI.getList()
    set({ observers })
  },

  setColorCorrectApplied: valueSetter(set, 'colorCorrectApplied'),
}))

const canParse = (state) => {
  const { sourceFolder, sourceFolderValid, observerCode, jobMode, localOutputFolder } = state
  if (!sourceFolder) return false
  if (!sourceFolderValid) return false
  if (!observerCode) return false
  if (jobMode === JOB_MODES.UNSET) return false
  if (jobMode === JOB_MODES.BY_IMAGE && !localOutputFolder) return false
  // reportDir is optional, so we don't check that
  return true
}

export { canParse, initialState }
export default useJobStore
