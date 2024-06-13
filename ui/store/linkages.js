import { valueSetter } from './utils'
import { selectedSightingHasOverlap } from './sightings'
import { getSelectedFolder } from './folders'
import { getActiveVideo } from './videos'

import linkagesAPI from '../api/linkages'
import thumbnailsAPI from '../api/thumbnails'
import { transformLinkageData, sortLinkageData } from '../utilities/transformers'
import { thumbnailFromVideoElement } from '../utilities/image'
import { VIEW_MODES, LINKAGE_MODES } from '../constants/routes'
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '../constants/dimensions'
import { DRAWING } from '../constants/tools'

const initialState = {
  viewMode: VIEW_MODES.BY_VIDEO,
  linkageMode: LINKAGE_MODES.BLANK,
  linkages: [],

  // Active Linkage being Created/Viewed/Edited
  activeLinkageId: null,
  regionStart: null,
  regionEnd: null,
  annotations: [],
  temporaryThumbnail: null,

  // Cache-busting for when we edit a thumbnail
  thumbnailCacheBuster: {},

  // Annotation Drawing
  activeDrawTool: DRAWING.POINTER,
}

const createLinkagesStore = (set, get) => ({
  ...initialState,
  resetLinkagesStore: () => set(initialState),

  setViewMode: valueSetter(set, 'viewMode'),
  setLinkageMode: valueSetter(set, 'linkageMode'),

  loadLinkages: async () => {
    const selectedFolder = getSelectedFolder(get())
    const linkageData = await linkagesAPI.byFolder(
      selectedFolder.year,
      selectedFolder.month,
      selectedFolder.day,
      selectedFolder.observer
    )
    const transformedData = linkageData.map(transformLinkageData)
    const sortedData = sortLinkageData(transformedData)
    set({ linkages: sortedData })
  },

  deleteLinkage: async (linkageId) => {
    const statusCode = await linkagesAPI.deleteLinkage(linkageId)
    if (statusCode === 409) {
      get().makeAlert(
        'Linakge deletion failed.\nIt appears that you have the linkage data file open.\nPlease close it before proceeding.',
        'error'
      )
    }
    if (statusCode !== 200) return

    const { loadLinkages, selectLinkageVideoSighting, activeVideoId } = get()
    selectLinkageVideoSighting(null, activeVideoId, null)
    loadLinkages()
  },

  // Used for Linkage Creation only
  setRegionStart: valueSetter(set, 'regionStart'),
  setRegionEnd: valueSetter(set, 'regionEnd'),
  setAnnotations: valueSetter(set, 'annotations'),

  // Used for Linkage Viewing/Editing
  selectLinkageVideoSighting: (linkageId, videoId, sightingId, skipAutoSeek = false) => {
    const { clearCreatedLinkage, clearEditDialogs, setActiveDrawTool } = get()
    clearCreatedLinkage()
    clearEditDialogs()
    setActiveDrawTool(DRAWING.POINTER)
    set({
      linkageMode: linkageId ? LINKAGE_MODES.EDIT : LINKAGE_MODES.BLANK,
      activeLinkageId: linkageId,
      activeVideoId: videoId,
      selectedSightingId: sightingId,
      skipAutoSeek,
    })
  },

  setRegionStartAndCaptureThumbnail: async (frameNumber, videoElement) => {
    set({ temporaryThumbnail: null })
    thumbnailFromVideoElement(videoElement, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT).then((imageBlob) => {
      set({ temporaryThumbnail: imageBlob })
    })

    // This will proceed asynchronously, but that's okay, the thumbnail will finish
    // capturing in the background
    set({ regionStart: frameNumber })
  },

  saveLinkage: async (clearAll = false) => {
    const state = get()
    const {
      selectedSightingId,
      regionStart,
      regionEnd,
      annotations,
      temporaryThumbnail,
      clearCreatedLinkage,
      clearEditDialogs,
      setActiveDrawTool,
      loadLinkages,
    } = state
    const activeVideo = getActiveVideo(state)

    const thumbnailPartialPath = thumbnailsAPI.formulateSavePath(
      getSelectedFolder(state),
      activeVideo.fileName
    )
    const thumbnailStatus = await thumbnailsAPI.save(thumbnailPartialPath, temporaryThumbnail)
    if (!thumbnailStatus) return

    const response = await linkagesAPI.create({
      CatalogVideoId: activeVideo.id,
      StartTime: regionStart,
      EndTime: regionEnd,
      SightingId: selectedSightingId,
      Annotation: annotations,
      ThumbnailFilePath: thumbnailPartialPath,
    })

    if (response.status === 409) {
      get().makeAlert(
        `Linakge creation failed.
        It appears that you have the linkage data file open.
        Please close it before proceeding.`,
        'error'
      )
    }
    if (response.status !== 200) return null

    clearCreatedLinkage(clearAll)
    clearEditDialogs()
    setActiveDrawTool(DRAWING.POINTER)
    await loadLinkages()
    return response?.data?.['LinkageId']
  },

  clearCreatedLinkage: (clearAll = false) => {
    const { regionStart, regionEnd, annotations } = initialState
    set({ regionStart, regionEnd, annotations })
    if (clearAll === true) {
      set({ selectedSightingId: null })
    }
  },

  updateLinkage: async (linkageId, payload) => {
    const { clearCreatedLinkage, clearEditDialogs, setActiveDrawTool, loadLinkages } = get()
    const status = await linkagesAPI.update(linkageId, payload)

    if (status === 409) {
      get().makeAlert(
        `Linakge update failed.
        It appears that you have the linkage data file open.
        Please close it before proceeding.`,
        'error'
      )
    }
    if (status !== 200) return

    clearCreatedLinkage()
    clearEditDialogs()
    setActiveDrawTool(DRAWING.POINTER)
    await loadLinkages()
  },

  incrementCacheBuster: (thumbnailURL) => {
    set((state) => ({
      thumbnailCacheBuster: { ...state.thumbnailCacheBuster, [thumbnailURL]: Date.now() },
    }))
  },

  setActiveDrawTool: valueSetter(set, 'activeDrawTool'),
})

const getActiveLinkage = ({ linkages, activeLinkageId }) =>
  linkages.find((linkage) => linkage.id === activeLinkageId)

const linkagesForActiveVideo = ({ activeVideoId, linkages }) =>
  linkages.filter((linkage) => linkage.video.id === activeVideoId)

const isSaveable = (state) => {
  if (state.regionStart == null) return false
  if (state.regionEnd == null) return false
  if (state.regionStart >= state.regionEnd) return false
  if (state.selectedSightingId == null) return false
  if (selectedSightingHasOverlap(state)) return false
  return true
}

export { getActiveLinkage, linkagesForActiveVideo, isSaveable }
export default createLinkagesStore
