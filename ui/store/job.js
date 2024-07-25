import { create } from 'zustand'

import { valueSetter } from './utils'
import { JOB_PHASES, JOB_MODES } from '../constants/routes'
import ingestAPI from '../api/ingest'

const initialState = {
  phase: JOB_PHASES.INPUTS,
  sourceFolder: '',
  numFiles: { images: null, videos: null },
  jobMode: JOB_MODES.UNSET,
  localOutputFolder: '',
  batchRenameRules: {
    trimStart: 0,
    trimEnd: 0,
    prefix: '',
    suffix: '',
    insertAt: -1,
    insertText: '',
    findString: '',
    replaceString: '',
  },
  compressionBuckets: {
    small: {},
    medium: {},
    large: {},
  },
  steps: [],
}

const useJobStore = create((set, get) => ({
  ...initialState,
  reset: () => set(initialState),

  setPhase: valueSetter(set, 'phase'),

  setSourceFolder: valueSetter(set, 'sourceFolder'),

  countFiles: async () => {
    const { sourceFolder } = get()
    const numFiles = await ingestAPI.countFiles(sourceFolder)
    set({ numFiles })
  },

  setJobMode: valueSetter(set, 'jobMode'),

  setLocalOutputFolder: valueSetter(set, 'localOutputFolder'),

  setBatchRenameRules: valueSetter(set, 'batchRenameRules'),

  setCompressionBuckets: valueSetter(set, 'compressionBuckets'),

  /** Step Schema:
   * - fileName: str
   * - newName: str | optional
   * - transcodeSettings: {}
   */
  setSteps: valueSetter(set, 'steps'),
}))

export default useJobStore
