import { useState, useEffect, useMemo, useRef } from 'react'
import Box from '@mui/material/Box'

import useStore from '../store'
import useJobStore, { initialState } from '../store/job'
import STATUSES, { ERRORS, WARNINGS } from '../constants/statuses'
import { JOB_PHASES, JOB_MODES } from '../constants/routes'
import { ROOT_FOLDER, BUCKET_THRESHOLDS } from '../constants/fileTypes'
import ingestAPI from '../api/ingest'
import {
  bytesToSize,
  twoPrecisionStrNum,
  secondsToDuration,
  fileNameGoodLength,
  fileNameGoodWhitespace,
} from '../utilities/strings'
import {
  transformMediaMetadata,
  groupMediaMetadataBySubfolder,
  calculateStatus,
  dumbClone,
} from '../utilities/transformers'
import { resolutionToTotalPixels } from '../utilities/numbers'
import useWindowSize from '../hooks/useWindowSize'

import BlankSlate from '../components/BlankSlate'
import MetadataDisplayTable from '../components/MetadataDisplayTable'
import MetadataSubfolder from '../components/MetadataSubfolder'
import IngestParseSidebar from './IngestParseSidebar'
import CompressionSidebar from './CompressionSidebar'
import CompressionBucketsList from '../components/CompressionBucketsList'
import DarkSampleDialog from '../components/DarkSampleDialog'

const LinkageAnnotationPage = () => {
  const sourceFolder = useJobStore((state) => state.sourceFolder)

  const phase = useJobStore((state) => state.phase)
  const jobMode = useJobStore((state) => state.jobMode)
  const jobId = useJobStore((state) => state.jobId)

  const metadataFilter = useJobStore((state) => state.metadataFilter)
  const issueIgnoreList = useJobStore((state) => state.issueIgnoreList)
  const batchRenameRules = useJobStore((state) => state.batchRenameRules)
  const processBatchRenameOnString = useJobStore((state) => state.processBatchRenameOnString)

  /* Poll for Parse Data, handle statuses */
  const [parseStatus, setParseStatus] = useState(STATUSES.LOADING)
  const [mediaGroups, setMediaGroups] = useState([])
  const [totalSize, setTotalSize] = useState(0)
  const [allWarnings, setAllWarnings] = useState(new Map())
  const [allErrors, setAllErrors] = useState(new Map())

  useEffect(() => {
    if (phase !== JOB_PHASES.PARSE) return

    setParseStatus(STATUSES.LOADING)
    setMediaGroups([])
    setTotalSize(0)
    setAllWarnings(new Map())
    setAllErrors(new Map())
    let intervalId

    const checkForMetadata = async () => {
      const { status, error } = await ingestAPI.jobStatus(jobId)
      if (status === STATUSES.QUEUED) return
      if (status === STATUSES.INCOMPLETE) {
        if (error) {
          setParseStatus(error)
          clearInterval(intervalId)
        }
        return
      }

      // Status must be Completed at this point
      clearInterval(intervalId)

      const data = await ingestAPI.getJobResultData(jobId)
      const transformedData = data.map(transformMediaMetadata)
      const groupsAndAggregates = groupMediaMetadataBySubfolder(sourceFolder, transformedData)
      setMediaGroups(groupsAndAggregates.mediaGroups)
      setTotalSize(groupsAndAggregates.totalSize)
      setAllWarnings(groupsAndAggregates.allWarnings)
      setAllErrors(groupsAndAggregates.allErrors)
      setParseStatus(STATUSES.COMPLETED)
    }

    intervalId = setInterval(checkForMetadata, 1000)
    return () => clearInterval(intervalId)
  }, [phase, jobId])

  /* Trigger Compression Options page - for images only */
  const compressionBuckets = useJobStore((state) => state.compressionBuckets)
  const setCompressionBuckets = useJobStore((state) => state.setCompressionBuckets)
  const setCompressionSelection = useJobStore((state) => state.setCompressionSelection)
  const moveToCompressionPage = () => {
    const newBuckets = dumbClone(initialState.compressionBuckets)
    mediaGroups.forEach((group) =>
      group.mediaList.forEach((media) => {
        const megapixels = resolutionToTotalPixels(media.resolution)
        if (megapixels < BUCKET_THRESHOLDS.medium) {
          newBuckets.small.images.push(media.filePath)
          newBuckets.small.size += media.fileSize
          newBuckets.small.sizes.push(media.fileSize)
        } else if (megapixels < BUCKET_THRESHOLDS.large) {
          newBuckets.medium.images.push(media.filePath)
          newBuckets.medium.size += media.fileSize
          newBuckets.medium.sizes.push(media.fileSize)
        } else {
          newBuckets.large.images.push(media.filePath)
          newBuckets.large.size += media.fileSize
          newBuckets.large.sizes.push(media.fileSize)
        }
      })
    )
    setCompressionBuckets(newBuckets)
    setPhase(JOB_PHASES.CHOOSE_OPTIONS)
  }

  /* Poll for Compression Samples, handle statuses */
  const [sampleStatus, setSampleStatus] = useState(STATUSES.LOADING)
  const [sampleImages, setSampleImages] = useState([])
  useEffect(() => {
    if (phase !== JOB_PHASES.CHOOSE_OPTIONS) return

    setSampleStatus(STATUSES.LOADING)
    setSampleImages([])
    let intervalId

    const checkForImages = async () => {
      const { status, error } = await ingestAPI.jobStatus(jobId)
      if (status === STATUSES.QUEUED) return
      if (status === STATUSES.INCOMPLETE) {
        if (error) {
          setSampleStatus(error)
          clearInterval(intervalId)
        }
        return
      }

      // Status must be Completed at this point
      clearInterval(intervalId)

      const sampleData = await ingestAPI.getJobSampleData(jobId)
      setSampleImages(sampleData)
      setSampleStatus(STATUSES.COMPLETED)
    }

    intervalId = setInterval(checkForImages, 1000)
    return () => clearInterval(intervalId)
  }, [phase, jobId])

  const whenAllImagesHaveLoaded = async () => {
    await ingestAPI.deleteSampleImages(jobId)
  }

  /* Poll for Dark Image Numbers, handle statuses */
  const jobIdDark = useJobStore((state) => state.jobIdDark)
  const triggerDarkSampleImages = useJobStore((state) => state.triggerDarkSampleImages)
  const [darkNumStatus, setDarkNumStatus] = useState(STATUSES.LOADING)
  const [darkNumProgress, setDarkNumProgress] = useState(0)
  const [darkImagePaths, setDarkImagePaths] = useState([])
  useEffect(() => {
    if (phase !== JOB_PHASES.CHOOSE_OPTIONS) return
    if (!jobIdDark) return

    setDarkNumStatus(STATUSES.LOADING)
    setDarkNumProgress(0)
    setDarkImagePaths([])
    let intervalId

    const checkForDarkNums = async () => {
      const { status, error } = await ingestAPI.jobStatus(jobIdDark)
      if (status === STATUSES.QUEUED) return
      if (status === STATUSES.INCOMPLETE) {
        const tasks = await ingestAPI.taskStatusesForJob(jobIdDark)
        const numCompleted = tasks.filter((task) => task.status === STATUSES.COMPLETED).length
        setDarkNumProgress(numCompleted)
        if (error) {
          setDarkNumStatus(error)
          clearInterval(intervalId)
        }
        return
      }

      // Status must be Completed at this point
      clearInterval(intervalId)

      const darkImagePaths = await ingestAPI.getDarkData(jobIdDark)
      setDarkImagePaths(darkImagePaths)
      setDarkNumStatus(STATUSES.COMPLETED)
      triggerDarkSampleImages(darkImagePaths)
    }

    intervalId = setInterval(checkForDarkNums, 1000)
    return () => clearInterval(intervalId)
  }, [phase, jobIdDark])

  const triggerSampleImages = useJobStore((state) => state.triggerSampleImages)
  const canRecreateBuckets =
    jobIdDark != null && darkNumStatus === STATUSES.COMPLETED && darkImagePaths.length > 0
  const recreateBuckets = () => {
    triggerSampleImages(darkImagePaths)
  }

  /* Poll for Dark Sample Image, handle statuses */
  const jobIdDarkSample = useJobStore((state) => state.jobIdDarkSample)
  const [darkSampleStatus, setDarkSampleStatus] = useState(STATUSES.LOADING)
  const [darkSampleProgress, setDarkSampleProgress] = useState(0)
  const [darkSampleImages, setDarkSampleImages] = useState([])
  const [darkSampleDialog, setDarkSampleDialog] = useState(false)
  const [darkSampleSelection, setDarkSampleSelection] = useState({})

  useEffect(() => {
    if (phase !== JOB_PHASES.CHOOSE_OPTIONS) return
    if (!jobIdDarkSample) return

    setDarkSampleStatus(STATUSES.LOADING)
    setDarkSampleProgress(0)
    setDarkSampleImages([])
    setDarkSampleSelection({})
    let intervalId

    const checkForDarkSamples = async () => {
      const { status, error } = await ingestAPI.jobStatus(jobIdDarkSample)
      if (status === STATUSES.QUEUED) return
      if (status === STATUSES.INCOMPLETE) {
        const tasks = await ingestAPI.taskStatusesForJob(jobIdDarkSample)
        const numCompleted = tasks.filter((task) => task.status === STATUSES.COMPLETED).length
        setDarkSampleProgress(numCompleted)
        if (error) {
          setDarkSampleStatus(error)
          clearInterval(intervalId)
        }
        return
      }

      // Status must be Completed at this point
      clearInterval(intervalId)

      const darkImages = await ingestAPI.getJobSampleData(jobIdDarkSample)
      setDarkSampleImages(darkImages)
      setDarkSampleSelection(Object.fromEntries(darkImages.map((image) => [image.file_name, true])))
      setDarkSampleStatus(STATUSES.COMPLETED)
    }

    intervalId = setInterval(checkForDarkSamples, 1000)
    return () => clearInterval(intervalId)
  }, [phase, jobIdDarkSample])

  /* Trigger Execute, which now means "Add job to queue" */
  const setSettingsList = useJobStore((state) => state.setSettingsList)
  const setPhase = useJobStore((state) => state.setPhase)
  const executeJob = () => {
    if (jobMode === JOB_MODES.BY_VIDEO) {
      const settingsList = mediaGroups.flatMap((group) =>
        group.mediaList.map((media) => ({
          file_path: media.filePath,
          new_name: media.newName,
          input_height: media.height,
          num_frames: media.numFrames,
          output_framerate: Math.round(media.frameRate),
        }))
      )
      setSettingsList(settingsList)
    } else {
      const darkImagesSelected = Object.fromEntries(
        Object.keys(darkSampleSelection).map((name) => [
          name.replace('_color_corrected.jpg', ''),
          true,
        ])
      )
      const settingsList = mediaGroups.flatMap((group) =>
        group.mediaList.map((media) => {
          let bucket = 'small'
          if (compressionBuckets.medium.images.includes(media.filePath)) {
            bucket = 'medium'
          } else if (compressionBuckets.large.images.includes(media.filePath)) {
            bucket = 'large'
          }
          return {
            file_path: media.filePath,
            new_name: media.newName,
            jpeg_quality: compressionBuckets[bucket].selection,
            is_dark: media.fileName in darkImagesSelected,
          }
        })
      )
      setSettingsList(settingsList)
    }
    setPhase(JOB_PHASES.EXECUTE)
  }

  /* User controlled data processing */
  const mediaGroupsFiltered = useMemo(() => {
    if (!metadataFilter) return mediaGroups
    const objForFilter = ERRORS.get(metadataFilter) ?? WARNINGS.get(metadataFilter)
    if (objForFilter.groupLevel) {
      return mediaGroups.filter((group) => group.statusText === objForFilter.message)
    }
    return mediaGroups.map((group) => {
      const mediaList = group.mediaList.filter(
        (media) => media.warnings.includes(metadataFilter) || media.errors.includes(metadataFilter)
      )
      return { ...group, mediaList }
    })
  }, [JSON.stringify(mediaGroups), metadataFilter])

  const mediaGroupsFilteredAndIgnored = useMemo(() => {
    const groupLevelIgnores = issueIgnoreList.reduce((acc, issue) => {
      const objForFilter = ERRORS.get(issue) ?? WARNINGS.get(issue)
      if (!objForFilter.groupLevel) return acc
      acc.push(objForFilter.message)
      return acc
    }, [])
    return mediaGroupsFiltered.map((group) => {
      let newGroupStatus = group.status
      if (groupLevelIgnores.includes(group.statusText)) {
        newGroupStatus = STATUSES.SUCCESS
      }
      const mediaList = group.mediaList.map((media) => {
        const hasNewName = media.newName && media.newName !== media.fileName
        const hasNewNameOfGoodLength = hasNewName && fileNameGoodLength(media.newName)
        const hasNewNameOfGoodWhitespace = hasNewName && fileNameGoodWhitespace(media.newName)
        const newWarnings = media.warnings.filter((w) => !issueIgnoreList.includes(w))
        const newErrors = [
          ...media.errors,
          ...(hasNewName && !hasNewNameOfGoodLength && !media.errors.includes('LENGTH_ERROR')
            ? ['LENGTH_ERROR']
            : []),
          ...(hasNewName &&
          !hasNewNameOfGoodWhitespace &&
          !media.errors.includes('WHITESPACE_ERROR')
            ? ['WHITESPACE_ERROR']
            : []),
        ].filter((e) => {
          if (e === 'LENGTH_ERROR' && hasNewNameOfGoodLength) return false
          if (e === 'WHITESPACE_ERROR' && hasNewNameOfGoodWhitespace) return false
          return true
        })
        const newMediaStatus = calculateStatus(newErrors, newWarnings)
        return {
          ...media,
          status: newMediaStatus,
          warnings: newWarnings,
          errors: newErrors,
        }
      })
      return { ...group, status: newGroupStatus, mediaList }
    })
  }, [JSON.stringify(mediaGroupsFiltered), issueIgnoreList])

  /* Apply batch rename rules to all filenames in the data */
  const makeAlert = useStore((state) => state.makeAlert)
  const invalidateBatchRenameRules = useJobStore((state) => state.invalidateBatchRenameRules)
  useEffect(() => {
    if (!batchRenameRules.applied) return
    // Capture Name Duplicates to report the Conflict to the user
    const newNameOldNameMap = {}
    const duplicates = {}

    const newMediaGroups = mediaGroups.map((group) => {
      const groupName = group.subfolder

      const newMediaList = group.mediaList.map((media) => {
        const oldName = media.fileName
        const newName = processBatchRenameOnString(media.fileName)

        if (newNameOldNameMap?.[groupName]?.[newName]) {
          if (!duplicates?.[groupName]?.[newName]) {
            if (!duplicates[groupName]) {
              duplicates[groupName] = {}
            }
            duplicates[groupName][newName] = [newNameOldNameMap[groupName][newName]]
          }
          duplicates[groupName][newName].push(oldName)
        } else {
          if (!newNameOldNameMap[groupName]) {
            newNameOldNameMap[groupName] = {}
          }
          newNameOldNameMap[groupName][newName] = oldName
        }

        return { ...media, newName }
      })

      return { ...group, mediaList: newMediaList }
    })

    if (Object.keys(duplicates).length > 0) {
      const exampleConflicts = Object.values(duplicates).flatMap((group) =>
        Object.entries(group)
          .map(([newName, oldNames], index) => {
            if (index > 2) return
            return `${oldNames.map((oldName) => `${oldName} → ${newName}`).join('\n')}`
          })
          .join('\n\n')
      )
      makeAlert(
        `Name Conflicts found in Batch Rename Rules. Here are some examples:\n
        ${exampleConflicts}`,
        'error'
      )
      invalidateBatchRenameRules()
      return
    }

    setMediaGroups(newMediaGroups)
  }, [batchRenameRules.applied, JSON.stringify(mediaGroups)])

  const setConfirmationDialogOpen = useStore((state) => state.setConfirmationDialogOpen)
  const setConfirmationDialogProps = useStore((state) => state.setConfirmationDialogProps)
  const triggerActionAfterParse = async () => {
    const filePathsWithPossibleNewNames = mediaGroups.flatMap((group) =>
      group.mediaList.map((media) => ({
        file_path: media.filePath,
        new_name: media.newName,
      }))
    )

    const someWindowsPathsTooLong = await ingestAPI.validatePathLengths(
      jobMode,
      sourceFolder,
      filePathsWithPossibleNewNames
    )
    if (someWindowsPathsTooLong) {
      makeAlert(
        'Some output file paths will be longer than the Windows maximum. Please correct this before proceeding.',
        'error'
      )
      return
    }

    let invalidPaths = []
    if (JSON.stringify(batchRenameRules) !== JSON.stringify(initialState.batchRenameRules)) {
      invalidPaths = await ingestAPI.validateNonExistence(
        jobMode,
        sourceFolder,
        filePathsWithPossibleNewNames
      )
    }

    if (Array.isArray(invalidPaths) && invalidPaths.length > 0) {
      const action = jobMode === JOB_MODES.BY_VIDEO ? executeJob : moveToCompressionPage
      setConfirmationDialogProps({
        title: 'Renames will overwrite',
        body: 'Some of the batch renames you applied have created filenames that will now overwrite existing files.\n\nAre you okay with this?',
        onConfirm: action,
      })
      setConfirmationDialogOpen(true)
      return
    }

    if (jobMode === JOB_MODES.BY_VIDEO) {
      executeJob()
    } else {
      moveToCompressionPage()
    }
  }

  /* Rendering Setup */
  const metadataTablesContainerRef = useRef(null)
  const { windowWidth, windowHeight } = useWindowSize()
  const [hasMainHorizontalScroll, setHasMainHorizontalScroll] = useState(false)
  const hasDataToDisplay = mediaGroupsFilteredAndIgnored.length > 0
  useEffect(() => {
    if (phase !== JOB_PHASES.PARSE) return
    if (!hasDataToDisplay) return
    const container = metadataTablesContainerRef?.current
    if (!container) return
    if (container.scrollWidth > container.clientWidth) {
      setHasMainHorizontalScroll(true)
    } else {
      setHasMainHorizontalScroll(false)
    }
  }, [phase, hasDataToDisplay, windowWidth, windowHeight])

  /* Phase Handling Returns */
  if (phase === JOB_PHASES.PARSE) {
    let columns = [
      {
        key: 'fileName',
        overwriteKey: 'newName',
        label: 'File Name',
        width: 150,
        truncateTooltip: true,
      },
      {
        key: 'extension',
        label: 'Type',
        align: 'right',
        width: 60,
        transformer: (value) => value.toUpperCase(),
      },
      {
        key: 'resolution',
        label: 'Resolution',
        align: 'right',
        width: 100,
        comparatorTransformer: resolutionToTotalPixels,
      },
    ]
    if (jobMode === JOB_MODES.BY_VIDEO) {
      columns.push(
        ...[
          {
            key: 'frameRate',
            label: 'FPS',
            align: 'right',
            width: 70,
            transformer: twoPrecisionStrNum,
          },
          {
            key: 'duration',
            label: 'Duration',
            align: 'right',
            width: 90,
            transformer: secondsToDuration,
            comparatorTransformer: parseFloat,
          },
        ]
      )
    }
    columns.push(
      ...[
        {
          key: 'fileSize',
          label: 'File Size',
          align: 'right',
          width: 80,
          transformer: bytesToSize,
        },
      ]
    )
    const canTriggerNextAction = (() => {
      if (!batchRenameRules.applied) return false
      return mediaGroupsFilteredAndIgnored.every((group) => {
        if (group.status === STATUSES.ERROR) return false
        return group.mediaList.every((media) => {
          if (media.status === STATUSES.ERROR) return false
          return true
        })
      })
    })()
    return (
      <Box sx={{ display: 'flex', height: '100%' }}>
        <IngestParseSidebar
          status={parseStatus}
          totalSize={totalSize}
          allWarnings={allWarnings}
          allErrors={allErrors}
          oneFileName={mediaGroups[0]?.mediaList[0]?.fileName}
          actionName={
            jobMode === JOB_MODES.BY_VIDEO ? 'Add Job to Queue' : 'Choose Compression Options'
          }
          canTrigger={canTriggerNextAction}
          onTriggerAction={triggerActionAfterParse}
        />
        <Box
          ref={metadataTablesContainerRef}
          sx={{
            flexGrow: 1,
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {mediaGroupsFilteredAndIgnored.map((group) => (
            <Box
              key={group.subfolder}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {group.subfolder !== ROOT_FOLDER && (
                <MetadataSubfolder status={group.status} statusText={group.statusText}>
                  {group.subfolder}
                </MetadataSubfolder>
              )}
              <MetadataDisplayTable
                columns={columns}
                data={group.mediaList}
                isSubfolder={group.subfolder !== ROOT_FOLDER}
                hasMainHorizontalScroll={hasMainHorizontalScroll}
              />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  if (phase === JOB_PHASES.CHOOSE_OPTIONS) {
    return (
      <Box sx={{ display: 'flex', height: '100%' }}>
        <CompressionSidebar
          status={sampleStatus}
          darkNumStatus={darkNumStatus}
          darkNumProgress={darkNumProgress}
          darkNum={darkImagePaths.length}
          darkSampleStatus={darkSampleStatus}
          darkSampleProgress={darkSampleProgress}
          onDarkSampleOpen={() => setDarkSampleDialog(true)}
          darkNumSelected={Object.keys(darkSampleSelection).length}
          canRecreateBuckets={canRecreateBuckets}
          recreateBuckets={recreateBuckets}
          actionName="Add Job to Queue"
          canTrigger={
            jobIdDark === null ||
            (darkNumStatus === STATUSES.COMPLETED &&
              (darkImagePaths.length > 0 ? darkSampleStatus === STATUSES.COMPLETED : true))
          }
          onTriggerAction={executeJob}
        />
        <Box
          sx={{
            flexGrow: 1,
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {sampleStatus === STATUSES.COMPLETED && (
            <CompressionBucketsList
              compressionBuckets={compressionBuckets}
              setCompressionSelection={setCompressionSelection}
              sampleImages={sampleImages}
              onImagesLoaded={whenAllImagesHaveLoaded}
            />
          )}
        </Box>

        <DarkSampleDialog
          open={darkSampleDialog}
          onClose={() => setDarkSampleDialog(false)}
          images={darkSampleImages}
          selectedImages={darkSampleSelection}
          setSelectedImages={setDarkSampleSelection}
        />
      </Box>
    )
  }

  if (phase === JOB_PHASES.EXECUTE) {
    return (
      <Box
        sx={{
          height: '100%',
          margin: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        Job added to the queue, feel free to return home
      </Box>
    )
  }

  return <BlankSlate message={`Unknown Phase: ${phase}`} />
}

export default LinkageAnnotationPage
