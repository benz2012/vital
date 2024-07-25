import { useState } from 'react'
import Box from '@mui/material/Box'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import RefreshIcon from '@mui/icons-material/Refresh'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

import FILE_TYPES from '../constants/fileTypes'
import SETTING_KEYS from '../constants/settingKeys'
import { JOB_MODES } from '../constants/routes'
import useJobStore from '../store/job'
import useSettingsStore from '../store/settings'
import FilePathSettingInput from '../components/FilePathSettingInput'
import StyledButton from '../components/StyledButton'

const JobModeButton = ({ value, children }) => (
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
  >
    {children}
  </ToggleButton>
)

const BubbleListItem = ({ children }) => (
  <Box sx={{ display: 'flex' }}>
    <RadioButtonUncheckedIcon fontSize="small" sx={{ marginTop: '2px', marginRight: 2 }} />
    <Box sx={{ fontWeight: 500 }}>{children}</Box>
  </Box>
)

const ChooseIngestInputs = () => {
  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const setSourceFolder = useJobStore((state) => state.setSourceFolder)

  const [loading, setLoading] = useState(false)
  const [loadedTimes, setLoadedTimes] = useState(0)
  const numFiles = useJobStore((state) => state.numFiles)
  const countFiles = useJobStore((state) => state.countFiles)

  const jobMode = useJobStore((state) => state.jobMode)
  const setJobMode = useJobStore((state) => state.setJobMode)

  const settings = useSettingsStore((state) => state.settings)

  const localOutputFolder = useJobStore((state) => state.localOutputFolder)
  const setLocalOutputFolder = useJobStore((state) => state.setLocalOutputFolder)

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        overflowY: 'auto',
        marginTop: 2,
        marginBottom: 2,
        display: 'flex',
        flexDirection: 'column',
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
        }}
      />

      <Box sx={{ marginTop: 2, marginBottom: 2, display: 'flex' }}>
        <StyledButton
          sx={{ height: '24px' }}
          onClick={async () => {
            setLoading(true)
            setLoadedTimes((prev) => prev + 1)
            await countFiles()
            setLoading(false)
          }}
          disabled={sourceFolder === '' || loading}
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
          disabled={numFiles.images === null && numFiles.videos === null}
        >
          <JobModeButton value={JOB_MODES.BY_IMAGE}>{numFiles.images ?? '#'} images</JobModeButton>
          <JobModeButton value={JOB_MODES.BY_VIDEO}>{numFiles.videos ?? '#'} videos</JobModeButton>
        </ToggleButtonGroup>
      </Box>

      {jobMode !== JOB_MODES.UNSET && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <BubbleListItem>Review {jobMode} metadata</BubbleListItem>
          {jobMode === JOB_MODES.BY_IMAGE && (
            <BubbleListItem>Set compression settings</BubbleListItem>
          )}
          <BubbleListItem>Transcode {jobMode} files</BubbleListItem>
          <BubbleListItem>
            Original {jobMode}s copied to
            <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily, fontWeight: 400 })}>
              {settings[SETTING_KEYS.BASE_FOLDER_OF_ORIGINAL_VIDEOS]}
            </Box>
          </BubbleListItem>
          <BubbleListItem>
            Optimized {jobMode}s exported to
            <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily, fontWeight: 400 })}>
              {settings[SETTING_KEYS.BASE_FOLDER_OF_VIDEOS]}
            </Box>
          </BubbleListItem>
          {jobMode === JOB_MODES.BY_IMAGE && (
            <BubbleListItem>
              Optimized {jobMode}s&nbsp;<em>locally</em>&nbsp;exported to
              <FilePathSettingInput
                value={localOutputFolder}
                onChange={(event) => setLocalOutputFolder(event.target.value)}
                onFolderClick={async () => {
                  const filePath = await window.api.selectFile(FILE_TYPES.FOLDER, sourceFolder)
                  if (!filePath) return
                  setLocalOutputFolder(filePath)
                }}
              />
            </BubbleListItem>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ChooseIngestInputs
