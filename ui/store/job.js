import { create } from 'zustand'
import { closest } from 'fastest-levenshtein'

import { valueSetter } from './utils'
import ROUTES, { JOB_PHASES, JOB_MODES } from '../constants/routes'
import { MAXIMUM_COMPRESSION_OPTION } from '../constants/fileTypes'
import ingestAPI from '../api/ingest'
import observersAPI from '../api/observers'
import { validateSourceFolder } from '../utilities/paths'
import { resolutionToTotalPixels } from '../utilities/numbers'
import useQueueStore from './queue'
import useRootStore from './index'

const compressionBucketBase = {
  images: [],
  selection: MAXIMUM_COMPRESSION_OPTION,
  resolutions: [],
  fileSizes: [],
  sampleReloading: false,
}

export const RENAME_DEFAULTS = {
  trimStart: 0,
  trimEnd: 0,
  prefix: '',
  suffix: '',
  insertText: '',
  insertAt: 0,
  findString: '',
  replaceString: '',
}

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
  batchRenameRules: [
    /* Shape of Objects in this array
      {
        id: '',
        filePaths: [], // list of source file paths to apply the rule to
        trimStart: 0,
        trimEnd: 0,
        prefix: '',
        suffix: '',
        insertText: '',
        insertAt: 0,
        findString: '',
        replaceString: '',
      }
    */
  ],
  batchRenameRulesValidated: false,
  compressionBuckets: {
    small: {
      ...compressionBucketBase,
      name: 'Small',
      bottomThreshold: 0,
      bucketAbove: 'medium',
    },
    medium: {
      ...compressionBucketBase,
      name: 'Medium',
      bottomThreshold: 9_000_000,
      bucketAbove: 'large',
    },
    large: {
      ...compressionBucketBase,
      name: 'Large',
      bottomThreshold: 22_000_000,
      bucketAbove: 'xlarge',
    },
    xlarge: {
      ...compressionBucketBase,
      name: 'Extra Large',
      bottomThreshold: 36_000_000,
      bucketAbove: null,
    },
  },
  jobId: null,
  jobIdDark: null,
  jobIdDarkSample: null,
  colorCorrectApplied: false,
  settingsList: [],
  observers: [],
  selectedRows: [],
  multiDayImport: false,
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
    const { sourceFolder, observerCode, jobMode } = get()
    const jobId = await ingestAPI.parse(jobMode, sourceFolder, observerCode)
    set({ jobId })
    ingestAPI.deleteSampleImages() // clean this up periodically
  },

  triggerSampleImages: async (imagesToExclude = []) => {
    const { compressionBuckets } = get()

    const possibleSampleImages = Object.keys(compressionBuckets).map((bucketKey) => {
      const imagesInBucket = compressionBuckets[bucketKey].images
      if (imagesInBucket.length === 0) return null
      // We try to filter out any that we don't want a sample of (e.g. dark images)
      const possibleImage = imagesInBucket.find(
        (image) => imagesToExclude.includes(image) === false
      )
      // But if that's not possible, we must have at least one sample, so take the first
      if (!possibleImage) return imagesInBucket[0]
      return possibleImage
    })

    const jobId = await ingestAPI.createSampleImages(...possibleSampleImages)
    set({ jobId })
  },

  triggerDarkImagesIdentify: async () => {
    const { compressionBuckets } = get()
    const buckets = Object.values(compressionBuckets)
    const allImagesFlatList = buckets.map((bucket) => bucket.images).flat(Infinity)
    const jobId = await ingestAPI.identifyDarkImages(allImagesFlatList)
    set({ jobIdDark: jobId })
  },

  triggerDarkSampleImages: async (filePaths) => {
    const jobId = await ingestAPI.createDarkSampleImages(filePaths)
    set({ jobIdDarkSample: jobId })
  },

  triggerExecute: async (jobIdDarkSample = null) => {
    const {
      jobMode,
      sourceFolder,
      settingsList,
      localOutputFolder,
      reportDir,
      observerCode,
      multiDayImport,
    } = get()

    await ingestAPI.transcode(
      sourceFolder,
      settingsList,
      jobMode,
      localOutputFolder,
      reportDir,
      observerCode
    )

    // Do some post-job filesystem cleanup
    ingestAPI.deleteSampleImages()
    if (jobMode === JOB_MODES.BY_IMAGE && jobIdDarkSample != null) {
      ingestAPI.deleteDarkSampleImages(jobIdDarkSample)
    }

    // After submitting a new job to the queue, Navigate the user back home,
    // reload the queue data, and reset some of the stores like we do in the Navbar
    useRootStore.getState().resetStore()
    useQueueStore.getState().fetchJobsData()
    useRootStore.getState().setRoute(ROUTES.TOOLS)

    if (multiDayImport) {
      // For multi-day imports, we keep the existing job state avaialble to reuse it against additional import folders
      useRootStore.getState().setMultiDayImportOpen(true)
    } else {
      // For a standard one-off jobs, open the queue and reset all existing job state
      useRootStore.getState().setJobQueueOpen(true)
      get().reset()
    }
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

  addBatchRenameRuleset: (newRuleset) => {
    const { batchRenameRules } = get()
    set({
      batchRenameRules: [...batchRenameRules, newRuleset],
      batchRenameRulesValidated: false,
    })
  },
  removeBatchRenameRuleset: (rulesetId) => {
    const { batchRenameRules } = get()
    set({
      batchRenameRules: batchRenameRules.filter((ruleset) => ruleset.id !== rulesetId),
      batchRenameRulesValidated: false,
    })
  },
  setAllRenamesValidated: valueSetter(set, 'batchRenameRulesValidated'),

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
  setCompressionSampleReloading: (bucketKey, value) => {
    const { compressionBuckets } = get()
    const newBuckets = {
      ...compressionBuckets,
      [bucketKey]: {
        ...compressionBuckets[bucketKey],
        sampleReloading: value,
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

  toggleRowSelection: (rowId) => {
    const { selectedRows } = get()
    const isSelected = selectedRows.includes(rowId)
    const newSelectedRows = isSelected
      ? selectedRows.filter((selectedRow) => selectedRow !== rowId)
      : [...selectedRows, rowId]
    set({ selectedRows: newSelectedRows })
  },
  setRowSelection: (rowIds) => set({ selectedRows: rowIds }),
  clearRowSelection: () => set({ selectedRows: [] }),

  setMultiDayImport: valueSetter(set, 'multiDayImport'),
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

/** Find the bucket that this resolution fits into
 *  Ensure this method matches the server-side implementation determine_bucket_for_resolution
 */
const determineBucketForResolution = (compressionBuckets, resolution) => {
  const megapixels = resolutionToTotalPixels(resolution)
  const foundBucketKey = Object.keys(compressionBuckets).find((bucketKey) => {
    const bucket = compressionBuckets[bucketKey]
    const imageLargerThanBucketMin = megapixels >= bucket.bottomThreshold
    if (!bucket.bucketAbove) return imageLargerThanBucketMin
    return (
      imageLargerThanBucketMin &&
      megapixels < compressionBuckets[bucket.bucketAbove].bottomThreshold
    )
  })
  return foundBucketKey
}

export { canParse, determineBucketForResolution, initialState }
export default useJobStore
