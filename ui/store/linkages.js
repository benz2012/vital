import { valueSetter } from './utils'
import { getSelectedSighting, selectedSightingHasOverlap } from './sightings'
import { getSelectedFolder } from './folders'
import { getActiveVideo } from './videos'

import linkagesAPI from '../api/linkages'
import thumbnailsAPI from '../api/thumbnails'
import { transformLinkageData, sortLinkageData } from '../utilities/transformers'
import { thumbnailFromVideoElement } from '../utilities/video'
import { VIEW_MODES, LINKAGE_MODES } from '../constants/routes'
import { THUMBNAIL_WIDTH } from '../constants/dimensions'

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
    const success = await linkagesAPI.deleteLinkage(linkageId)
    if (success) {
      const { loadLinkages, selectLinkageVideoSighting, activeVideoId } = get()
      selectLinkageVideoSighting(null, activeVideoId, null)
      loadLinkages()
    }
  },

  // Used for Linkage Creation only
  setRegionStart: valueSetter(set, 'regionStart'),
  setRegionEnd: valueSetter(set, 'regionEnd'),
  setAnnotations: valueSetter(set, 'annotations'),

  // Used for Linkage Viewing/Editing
  selectLinkageVideoSighting: (linkageId, videoId, sightingId) => {
    set({
      linkageMode: linkageId ? LINKAGE_MODES.EDIT : LINKAGE_MODES.BLANK,
      activeLinkageId: linkageId,
      activeVideoId: videoId,
      selectedSightingId: sightingId,
    })
    get().clearCreatedLinkage()
  },

  setRegionStartAndCaptureThumbnail: async (frameNumber, videoElement) => {
    set({ temporaryThumbnail: null })
    thumbnailFromVideoElement(videoElement, THUMBNAIL_WIDTH).then((imageBlob) => {
      set({ temporaryThumbnail: imageBlob })
    })

    // This will proceed asynchronously, but that's okay, the thumbnail will finish
    // capturing in the background
    set({ regionStart: frameNumber })
  },

  saveLinkage: async (clearAll = false) => {
    const state = get()
    const {
      sightings,
      selectedSightingId,
      regionStart,
      regionEnd,
      annotations,
      temporaryThumbnail,
      clearCreatedLinkage,
      loadLinkages,
    } = state
    const activeVideo = getActiveVideo(state)
    const selectedSighting = getSelectedSighting({ sightings, selectedSightingId })

    const thumbnailPartialPath = thumbnailsAPI.formulateSavePath(
      selectedSightingId,
      selectedSighting.date,
      activeVideo.fileName,
      regionStart
    )
    const thumbnailStatus = await thumbnailsAPI.save(thumbnailPartialPath, temporaryThumbnail)
    if (!thumbnailStatus) return

    const saveData = await linkagesAPI.create({
      CatalogVideoId: activeVideo.id,
      StartTime: regionStart,
      EndTime: regionEnd,
      SightingId: selectedSightingId,
      Annotation: annotations,
      ThumbnailFilePath: thumbnailPartialPath,
    })

    const saveStatus = 'LinkageId' in saveData
    if (!saveStatus) return

    clearCreatedLinkage(clearAll)
    await loadLinkages()
    return saveData['LinkageId']
  },

  clearCreatedLinkage: (clearAll = false) => {
    const { regionStart, regionEnd, annotations } = initialState
    set({ regionStart, regionEnd, annotations })
    if (clearAll === true) {
      set({ selectedSightingId: null })
    }
  },
})

const getActiveLinkage = ({ linkages, activeLinkageId }) =>
  linkages.find((linkage) => linkage.id === activeLinkageId)

const linkagesForActiveVideo = ({ activeVideoId, linkages }) =>
  linkages.filter((linkage) => linkage.video.id === activeVideoId)

const isSaveable = (state) => {
  if (state.regionStart == null) return false
  if (state.regionEnd == null) return false
  if (state.selectedSightingId == null) return false
  if (selectedSightingHasOverlap(state)) return false
  return true
}

export { getActiveLinkage, linkagesForActiveVideo, isSaveable }
export default createLinkagesStore
