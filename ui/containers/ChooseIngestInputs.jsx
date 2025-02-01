import { useEffect, useState, useRef } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import RefreshIcon from '@mui/icons-material/Refresh'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import FILE_TYPES from '../constants/fileTypes'
import SETTING_KEYS from '../constants/settingKeys'
import { JOB_MODES } from '../constants/routes'
import useJobStore from '../store/job'
import useSettingsStore from '../store/settings'
import useWindowSize from '../hooks/useWindowSize'
import useLocalStorage from '../hooks/useLocalStorage'
import FilePathSettingInput from '../components/FilePathSettingInput'
import StyledButton from '../components/StyledButton'
import IngestInputsLineDrawing, {
  VerticalLineBetweenDots,
} from '../components/IngestInputsLineDrawing'
import { ERRORS } from '../constants/statuses'

const JobModeButton = ({ value, children, disabled }) => (
  <ToggleButton
    value={value}
    sx={{
      width: '200px',
      padding: 0,
      textTransform: 'none',
      fontWeight: 400,
      fontSize: '16px',
      '&.Mui-selected': {
        backgroundColor: 'white',
        color: 'black',
        fontWeight: 500,
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
      },
    }}
    disabled={disabled}
  >
    {children}
  </ToggleButton>
)

const BubbleListItem = ({ children, firstItem = false, lastItem = false }) => (
  <Box sx={{ display: 'flex', position: 'relative', marginTop: firstItem && 1.5 }}>
    <RadioButtonUncheckedIcon fontSize="small" sx={{ marginTop: '2px', marginRight: 2 }} />
    <Box sx={{ fontWeight: 500, flexGrow: 1 }}>{children}</Box>
    {!lastItem && <VerticalLineBetweenDots />}
  </Box>
)

const ChooseIngestInputs = () => {
  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const sourceFolderValid = useJobStore((state) => state.sourceFolderValid)
  const setSourceFolder = useJobStore((state) => state.setSourceFolder)

  const [loading, setLoading] = useState(false)
  const [loadedTimes, setLoadedTimes] = useState(0)
  const numFiles = useJobStore((state) => state.numFiles)
  const countFiles = useJobStore((state) => state.countFiles)

  const observers = useJobStore((state) => state.observers)
  const observerCode = useJobStore((state) => state.observerCode)
  const setObserverCode = useJobStore((state) => state.setObserverCode)

  const jobMode = useJobStore((state) => state.jobMode)
  const setJobMode = useJobStore((state) => state.setJobMode)
  const multiDayImport = useJobStore((state) => state.multiDayImport)
  const setMultiDayImport = useJobStore((state) => state.setMultiDayImport)

  const settings = useSettingsStore((state) => state.settings)

  const setLocalOutputFolderInStore = useJobStore((state) => state.setLocalOutputFolder)
  const [localOutputFolder, setLocalOutputFolder] = useLocalStorage('localOutputFolder', '')
  useEffect(() => {
    setLocalOutputFolderInStore(localOutputFolder)
  }, [localOutputFolder])

  const setReportDirInStore = useJobStore((state) => state.setReportDir)
  const [reportDir, setReportDir] = useLocalStorage('reportDir', '')
  useEffect(() => {
    setReportDirInStore(reportDir)
  }, [reportDir])

  const containerRef = useRef(null)
  const windowSize = useWindowSize()
  const [pixelsToSourceInputMiddle, setPixelsTo] = useState(0)
  useEffect(() => {
    setPixelsTo(parseInt(containerRef.current.clientWidth / 2, 10))
  }, [JSON.stringify(windowSize), jobMode])

  const triggerCountFiles = async () => {
    setJobMode(JOB_MODES.UNSET)
    setLoading(true)
    setLoadedTimes((prev) => prev + 1)
    await countFiles()
    setLoading(false)
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        flexGrow: 1,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        overflowY: 'auto',
        marginTop: 2,
        marginBottom: 2,
        paddingRight: 2,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <FilePathSettingInput
        label="Input Source Folder"
        value={sourceFolder}
        onChange={(event) => setSourceFolder(event.target.value)}
        onFolderClick={async () => {
          const filePath = await window.api.selectFile(FILE_TYPES.FOLDER, sourceFolder)
          if (!filePath) return
          setSourceFolder(filePath)
          triggerCountFiles()
        }}
        error={!sourceFolderValid}
        errorMessage="Folder name must be in the format YYYY-MM-DD-ObserverCode"
      />

      <Box sx={{ marginTop: 2, marginBottom: 2, display: 'flex' }}>
        <StyledButton
          sx={{ height: '24px' }}
          onClick={triggerCountFiles}
          disabled={sourceFolder === '' || !sourceFolderValid || loading}
        >
          <RefreshIcon
            sx={{
              marginRight: 1,
              transition: 'transform 500ms ease-in-out',
              transform: `rotate(${loadedTimes}turn)`,
            }}
          />
          Count Files
        </StyledButton>

        <ToggleButtonGroup
          exclusive
          sx={{ marginLeft: 2 }}
          value={jobMode}
          onChange={(event, newValue) => {
            if (newValue === null) return
            setJobMode(newValue)
          }}
          disabled={
            !sourceFolderValid ||
            (numFiles.images === null && numFiles.videos === null) ||
            numFiles.error
          }
        >
          <JobModeButton value={JOB_MODES.BY_IMAGE} disabled={numFiles.images === 0}>
            {numFiles.images ?? '#'} images
          </JobModeButton>
          <JobModeButton value={JOB_MODES.BY_VIDEO} disabled={numFiles.videos === 0}>
            {numFiles.videos ?? '#'} videos
          </JobModeButton>
        </ToggleButtonGroup>
      </Box>

      {numFiles.error && (
        <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
          <AlertTitle>{ERRORS.get(numFiles.error)?.summary || 'Error'}</AlertTitle>
          {ERRORS.get(numFiles.error)?.message || `${numFiles.error}`}
        </Alert>
      )}

      {jobMode !== JOB_MODES.UNSET && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <BubbleListItem firstItem>
            <Autocomplete
              options={observers}
              value={observerCode}
              onChange={(event, newValue) => setObserverCode(newValue)}
              disablePortal
              size="small"
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} small="small" label="Choose Observer Code" />
              )}
            />
          </BubbleListItem>

          <BubbleListItem>Review {jobMode} metadata</BubbleListItem>

          {jobMode === JOB_MODES.BY_IMAGE && (
            <BubbleListItem>Set compression settings</BubbleListItem>
          )}

          <BubbleListItem>Submit Job to Queue</BubbleListItem>

          <BubbleListItem lastItem>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                Reuse these settings for{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 700, color: multiDayImport ? 'primary.main' : 'inherit' }}
                >
                  Multi-Day
                </Box>{' '}
                import?
                <br />
                <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                  You can change your decision later.
                </Box>
              </Box>
              <Box
                sx={(theme) => ({
                  paddingLeft: 2,
                  height: theme.spacing(4),
                  width: '130px',
                  border: '1px solid',
                  borderColor: 'action.selected',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                })}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={multiDayImport}
                      onChange={(event) => setMultiDayImport(event.target.checked)}
                      sx={{ marginRight: 0.5 }}
                    />
                  }
                  label={
                    <Box
                      sx={{
                        color: multiDayImport ? 'primary.main' : 'inherit',
                        userSelect: 'none',
                      }}
                    >
                      {multiDayImport ? 'Yes' : 'No'}
                    </Box>
                  }
                />
              </Box>
            </Box>
          </BubbleListItem>

          <Box sx={{ fontWeight: 700 }}>During job execution</Box>

          <BubbleListItem>Transcode {jobMode} files</BubbleListItem>

          <BubbleListItem>
            Original {jobMode}s copied to
            <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily, fontWeight: 400 })}>
              {jobMode === JOB_MODES.BY_IMAGE
                ? settings[SETTING_KEYS.BASE_FOLDER_OF_ORIGINAL_IMAGES]
                : settings[SETTING_KEYS.BASE_FOLDER_OF_ORIGINAL_VIDEOS]}
            </Box>
          </BubbleListItem>

          <BubbleListItem>
            Optimized {jobMode}s exported to
            <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily, fontWeight: 400 })}>
              {jobMode === JOB_MODES.BY_IMAGE
                ? settings[SETTING_KEYS.BASE_FOLDER_OF_OPTIMIZED_IMAGES]
                : settings[SETTING_KEYS.BASE_FOLDER_OF_VIDEOS]}
            </Box>
          </BubbleListItem>

          {jobMode === JOB_MODES.BY_IMAGE && (
            <BubbleListItem>
              Optimized {jobMode}s&nbsp;<em>locally</em>&nbsp;exported to
              <FilePathSettingInput
                value={localOutputFolder}
                onChange={(event) => setLocalOutputFolder(event.target.value)}
                onFolderClick={async () => {
                  const filePath = await window.api.selectFile(
                    FILE_TYPES.FOLDER,
                    localOutputFolder || sourceFolder
                  )
                  if (!filePath) return
                  setLocalOutputFolder(filePath)
                }}
              />
            </BubbleListItem>
          )}

          <BubbleListItem lastItem>
            Report CSV <em>optionally</em> auto-exported to
            <br />
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
              Delete this file path to disable the auto-export.
            </Box>
            <FilePathSettingInput
              value={reportDir}
              onChange={(event) => setReportDir(event.target.value)}
              onFolderClick={async () => {
                const filePath = await window.api.selectFile(
                  FILE_TYPES.FOLDER,
                  reportDir || sourceFolder
                )
                if (!filePath) return
                setReportDir(filePath)
              }}
            />
          </BubbleListItem>
        </Box>
      )}

      {/* Line Drawing */}
      {jobMode !== JOB_MODES.UNSET && (
        <IngestInputsLineDrawing
          jobMode={jobMode}
          pixelsToSourceInputMiddle={pixelsToSourceInputMiddle}
        />
      )}
    </Box>
  )
}

export default ChooseIngestInputs
