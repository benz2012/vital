import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'

import useStore from '../store'
import useSettingsStore from '../store/settings'
import { getActiveVideo } from '../store/videos'
import {
  getSelectedSighting,
  getSelectedSightingName,
  selectedSightingHasOverlap,
} from '../store/sightings'
import { getActiveLinkage, linkagesForActiveVideo, isSaveable } from '../store/linkages'
import { getSelectedFolder } from '../store/folders'
import { useValueAndSetter } from '../store/utils'

import { leafPath } from '../utilities/paths'
import { catalogFolderString } from '../utilities/strings'
import {
  frameRateFromStr,
  timecodeFromFrameNumber,
  thumbnailFromVideoElement,
} from '../utilities/video'
import {
  initializePlayer,
  startSubscriptions,
  forceToHighestQuality,
  highestResolutionAvailable,
} from '../utilities/dashPlayer'
import { regionDataForLinkage } from '../utilities/transformers'
import { LINKAGE_MODES } from '../constants/routes'
import { STILL_FRAME_PREVIEW_WIDTH } from '../constants/dimensions'
import SETTING_KEYS from '../constants/settingKeys'

import videosAPI from '../api/videos'
import thumbnailsAPI from '../api/thumbnails'
import stillExportsAPI from '../api/stillExports'

import VideoPlayer from '../components/VideoPlayer'
import VideoTimeline from '../components/VideoTimeline'
import LinkageDetailsBox from '../components/LinkageDetailsBox'
import StyledButton from '../components/StyledButton'
import ExportStillDialog from '../components/ExportStillDialog'

const TIMELINE_HEIGHT = 48
const DETAILS_HEIGHT = 245

const LinkageWorkspace = () => {
  const activeVideoId = useStore((state) => state.activeVideoId)
  const activeVideo = useStore(getActiveVideo)
  const activeVideoURL = activeVideo
    ? videosAPI.getVideoURL(activeVideo.folderId, activeVideo.fileName)
    : ''
  const activeVideoName = activeVideo ? leafPath(activeVideo.fileName) : ''
  const existingRegions = useStore((state) =>
    linkagesForActiveVideo(state).map(regionDataForLinkage)
  )
  const videoFrameRate = activeVideo && frameRateFromStr(activeVideo.frameRate)

  const settings = useSettingsStore((state) => state.settings)
  const selectedFolder = useStore(getSelectedFolder)
  const catalogFolderName = catalogFolderString(selectedFolder)

  // Linkage Creation State & Actions
  const regionStart = useStore((state) => state.regionStart)
  const [regionEnd, setRegionEnd] = useValueAndSetter(useStore, 'regionEnd', 'setRegionEnd')
  const annotations = useStore((state) => state.annotations)
  const setRegionStartAndCaptureThumbnail = useStore(
    (state) => state.setRegionStartAndCaptureThumbnail
  )
  const saveable = useStore(isSaveable)
  const saveLinkage = useStore((state) => state.saveLinkage)

  // Selected/Active Linkage State & Actions
  const activeLinkageId = useStore((state) => state.activeLinkageId)
  const activeLinkage = useStore(getActiveLinkage)
  const selectLinkageVideoSighting = useStore((state) => state.selectLinkageVideoSighting)
  const selectedSightingId = useStore((state) => state.selectedSightingId)
  const selectedSighting = useStore(getSelectedSighting)
  const sightingName = useStore(getSelectedSightingName)
  const setSightingsDialogOpen = useStore((state) => state.setSightingsDialogOpen)
  const thumbnailURL =
    activeLinkage?.thumbnail && thumbnailsAPI.formulateHostedPath(activeLinkage?.thumbnail)
  const hasOverlap = useStore(selectedSightingHasOverlap)
  const deleteLinkage = useStore((state) => state.deleteLinkage)

  // Video State that we imperatively subscribe to
  const videoElementRef = useRef(null)
  const videoFrameNumber = useStore((state) => state.videoFrameNumber)
  const setVideoFrameNumber = useStore((state) => state.setVideoFrameNumber)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoRangesBuffered, setVideoRangesBuffered] = useState([])
  const [activeVideoLoading, setActiveVideoLoading] = useState(false)
  const [videoResolution, setVideoResolution] = useState('')

  useEffect(() => {
    setVideoDuration(0)
    setVideoFrameNumber(0)
    setVideoRangesBuffered([])
  }, [activeVideoURL])

  const seekToFrame = (frame) => {
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = frame / videoFrameRate
    }
  }

  // DashJS Instance Create/Destroy & Actions
  const mediaPlayerRef = useRef(null)
  const stopSubscriptionsRef = useRef(null)
  useEffect(() => {
    if (!activeVideoURL) return () => null

    setActiveVideoLoading(true)
    const onStreamInitialized = () => {
      setActiveVideoLoading(false)
      setVideoResolution(highestResolutionAvailable(mediaPlayerRef.current))
    }

    mediaPlayerRef.current = initializePlayer(videoElementRef.current, activeVideoURL)
    stopSubscriptionsRef.current = startSubscriptions(
      mediaPlayerRef.current,
      onStreamInitialized,
      null
    )

    return () => {
      stopSubscriptionsRef.current()
      mediaPlayerRef.current.destroy()
      mediaPlayerRef.current = null
    }
  }, [activeVideoURL])

  // Set the playhead to the region start when a Linkage is Selected
  const previousVideoURL = useRef(null)
  useEffect(() => {
    if (linkageMode === LINKAGE_MODES.CREATE) return
    if (!activeLinkageId) return
    if (!activeVideoURL) return
    if (!videoElementRef.current) return

    const video = videoElementRef.current

    // The video didn't change, so just seek to the new regionStart
    if (previousVideoURL.current === activeVideoURL) {
      seekToFrame(activeLinkage?.regionStart)
      video.play()
      return
    }

    const seekAfterVideoHasDuration = () => {
      seekToFrame(activeLinkage?.regionStart)
      video.play()
      video.removeEventListener('durationchange', seekAfterVideoHasDuration)
    }

    video.addEventListener('durationchange', seekAfterVideoHasDuration)
    previousVideoURL.current = activeVideoURL

    return () => {
      video.removeEventListener('durationchange', seekAfterVideoHasDuration)
    }
  }, [activeLinkageId])

  // TODO: fix this
  // useEffect(() => {
  //   if (!videoElementRef.current) return
  //   if (videoFrameNumber >= regionEnd) {
  //     videoElementRef.current.pause()
  //   }
  // }, [videoFrameNumber])

  // Linkage Mode & Selection Handling
  const viewMode = useStore((state) => state.viewMode)
  const linkageMode = useStore((state) => state.linkageMode)
  const setLinkageMode = useStore((state) => state.setLinkageMode)
  const linkages = useStore((state) => state.linkages)
  const selectLinkageByRegion = (start, end) => {
    const linkageToSelect = linkages.find(
      (linkage) => linkage.regionStart === start && linkage.regionEnd === end
    )
    selectLinkageVideoSighting(linkageToSelect.id, activeVideo.id, linkageToSelect.sighting.id)
  }

  // Export Still Frame & Dialog Handling
  const exportStillDialogOpen = useStore((state) => state.exportStillDialogOpen)
  const setExportStillDialogOpen = useStore((state) => state.setExportStillDialogOpen)
  const exportStillPreviewImage = useStore((state) => state.exportStillPreviewImage)
  const setExportStillPreviewImage = useStore((state) => state.setExportStillPreviewImage)

  const handleExportStillClick = async () => {
    videoElementRef.current.pause()
    setExportStillPreviewImage(null)
    thumbnailFromVideoElement(videoElementRef.current, STILL_FRAME_PREVIEW_WIDTH).then(
      setExportStillPreviewImage
    )
    setExportStillDialogOpen(true)
  }

  const handlePreviewRefresh = () => {
    stopSubscriptionsRef.current()
    // I don't know why, but seeking pushes the video back one frame, so we account for that with a +1
    forceToHighestQuality(mediaPlayerRef.current, (videoFrameNumber + 1) / videoFrameRate)
    const captureThumbnail = () => {
      thumbnailFromVideoElement(videoElementRef.current, STILL_FRAME_PREVIEW_WIDTH).then(
        (imageBlob) => {
          setExportStillPreviewImage(imageBlob)
          mediaPlayerRef.current.off('canPlay', captureThumbnail)
        }
      )
    }
    mediaPlayerRef.current.on('canPlay', captureThumbnail)
  }

  const exportStillFrame = () => {
    stillExportsAPI.create(
      activeVideoId,
      `test-${Math.floor(Math.random() * 10000)}.jpg`,
      videoFrameNumber
    )
  }

  const transitionFromEditToCreate = () => {
    selectLinkageVideoSighting(null, activeVideo.id, null)
    setLinkageMode(LINKAGE_MODES.CREATE)
  }

  const saveAndTransitionToEdit = async () => {
    const sightingIdBeforeSave = selectedSightingId
    const newLinkageId = await saveLinkage(true)
    selectLinkageVideoSighting(newLinkageId, activeVideo.id, sightingIdBeforeSave)
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <VideoPlayer
          ref={videoElementRef}
          url={activeVideoURL}
          siblingHeights={[TIMELINE_HEIGHT, DETAILS_HEIGHT]}
          frameRate={videoFrameRate}
          currentFrameNumber={videoFrameNumber}
          setVideoDuration={setVideoDuration}
          setCurrentFrameNumber={setVideoFrameNumber}
          setVideoRangesBuffered={setVideoRangesBuffered}
        />
      </Box>

      <Box sx={{ flex: `0 0 ${TIMELINE_HEIGHT}px` }}>
        <VideoTimeline
          bufferedRegions={videoRangesBuffered}
          existingRegions={existingRegions}
          regionStart={regionStart || activeLinkage?.regionStart}
          regionEnd={regionEnd || activeLinkage?.regionEnd}
          videoDuration={videoDuration}
          currentFrameNumber={videoFrameNumber}
          seekToFrame={seekToFrame}
          showRegionAsSelected={linkageMode === LINKAGE_MODES.EDIT}
          selectableRegions
          selectRegion={selectLinkageByRegion}
        />
      </Box>

      <Box sx={{ flex: `0 0 ${DETAILS_HEIGHT}px`, display: 'flex' }}>
        <Box sx={{ flexGrow: 1, textWrap: 'nowrap', overflow: 'hidden' }}>
          <LinkageDetailsBox
            mode={linkageMode}
            setMode={setLinkageMode}
            viewMode={viewMode}
            videoName={activeVideoName}
            hasOverlap={hasOverlap}
            frameRate={videoFrameRate}
            regionStart={regionStart || activeLinkage?.regionStart}
            regionEnd={regionEnd || activeLinkage?.regionEnd}
            setStart={() =>
              setRegionStartAndCaptureThumbnail(videoFrameNumber, videoElementRef.current)
            }
            setEnd={() => setRegionEnd(videoFrameNumber)}
            sightingName={sightingName} // --
            openSightingDialog={() => setSightingsDialogOpen(true)}
            annotations={annotations || activeLinkage?.annotations}
            deleteAnnotation={() => null}
            thumbnail={thumbnailURL}
          />
        </Box>
        <Box
          sx={{
            width: '200px',
            margin: 1,
            marginLeft: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Button Slot 1 */}
          {linkageMode === LINKAGE_MODES.BLANK && <StyledButton disabled>&nbsp;</StyledButton>}
          {[LINKAGE_MODES.CREATE, LINKAGE_MODES.EDIT].includes(linkageMode) && (
            <StyledButton disabled>Annotation Tools</StyledButton>
          )}

          {/* Button Slot 2 */}
          {linkageMode === LINKAGE_MODES.BLANK && <StyledButton disabled>&nbsp;</StyledButton>}
          {[LINKAGE_MODES.CREATE, LINKAGE_MODES.EDIT].includes(linkageMode) && (
            <StyledButton
              onClick={handleExportStillClick}
              disabled={
                !activeVideo ||
                activeVideoLoading ||
                (linkageMode === LINKAGE_MODES.CREATE &&
                  (!regionStart || !regionEnd || !sightingName))
              }
            >
              Export Still Frame
            </StyledButton>
          )}

          {/* Button Slot 3 */}
          {linkageMode === LINKAGE_MODES.BLANK && <StyledButton disabled>&nbsp;</StyledButton>}
          {linkageMode === LINKAGE_MODES.CREATE && (
            <StyledButton
              onClick={saveLinkage}
              color="tertiary"
              disabled={!saveable}
              style={{ fontSize: '18px' }}
            >
              Save + Add Another
            </StyledButton>
          )}
          {linkageMode === LINKAGE_MODES.EDIT && (
            <StyledButton
              onClick={() => deleteLinkage(activeLinkageId)}
              color="error"
              disabled={!activeVideo || activeVideoLoading}
            >
              Delete Linkage
            </StyledButton>
          )}

          {/* Button Slot 4 */}
          {linkageMode === LINKAGE_MODES.BLANK && <StyledButton disabled>&nbsp;</StyledButton>}
          {linkageMode === LINKAGE_MODES.CREATE && (
            <StyledButton
              onClick={saveAndTransitionToEdit}
              color="tertiary"
              variant="contained"
              disabled={!saveable}
            >
              Save Linkage
            </StyledButton>
          )}
          {linkageMode === LINKAGE_MODES.EDIT && (
            <StyledButton color="tertiary" onClick={transitionFromEditToCreate}>
              + Add Linkage
            </StyledButton>
          )}
        </Box>
      </Box>

      <ExportStillDialog
        open={exportStillDialogOpen}
        handleClose={() => setExportStillDialogOpen(false)}
        handleExport={exportStillFrame}
        handlePreviewRefresh={handlePreviewRefresh}
        image={exportStillPreviewImage && URL.createObjectURL(exportStillPreviewImage)}
        videoName={activeVideoName}
        frameNumber={videoFrameNumber}
        timestamp={timecodeFromFrameNumber(videoFrameNumber, videoFrameRate)}
        resolution={videoResolution}
        sightingLetter={selectedSighting?.letter}
        stillExportDir={settings[SETTING_KEYS.STILLEXPORT_DIR_PATH]}
        subFolder={catalogFolderName}
      />
    </Box>
  )
}

export default LinkageWorkspace
