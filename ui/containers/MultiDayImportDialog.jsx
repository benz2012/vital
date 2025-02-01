import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'

import useStore from '../store'
import useJobStore from '../store/job'
import useSettingsStore from '../store/settings'
import ingestAPI from '../api/ingest'
import SETTING_KEYS from '../constants/settingKeys'
import FILE_TYPES from '../constants/fileTypes'
import { TITLEBAR_HEIGHT } from '../constants/dimensions'
import { JOB_MODES } from '../constants/routes'
import { titleCase } from '../utilities/strings'
import { leafPath } from '../utilities/paths'
import usePrevious from '../hooks/usePrevious'

import StyledButton from '../components/StyledButton'
import PropertyLine from '../components/PropertyLine'
import StyledPillButton from '../components/StyledPillButton'
import MultiImportFolderList from '../components/MultiImportFolderList'

const propertyContainerStyles = (lineStyle = 'solid') => ({
  flex: '0 0 auto',
  width: '400px',
  border: `4px ${lineStyle}`,
  borderColor: 'action.disabled',
  borderRadius: 1,
  padding: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
})

const MultiDayImportDialog = () => {
  const multiDayImportOpen = useStore((state) => state.multiDayImportOpen)
  const setMultiDayImportOpen = useStore((state) => state.setMultiDayImportOpen)

  const setConfirmationDialogOpen = useStore((state) => state.setConfirmationDialogOpen)
  const setConfirmationDialogProps = useStore((state) => state.setConfirmationDialogProps)
  const confirmThenClose = () => {
    setConfirmationDialogProps({
      title: 'Finish Multi-Day Import',
      body: `Are you sure you want to exit this multi-day import?`,
      onConfirm: () => setMultiDayImportOpen(false),
    })
    setConfirmationDialogOpen(true)
  }

  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const jobMode = useJobStore((state) => state.jobMode)
  const observerCode = useJobStore((state) => state.observerCode)
  const localOutputFolder = useJobStore((state) => state.localOutputFolder)
  const reportDir = useJobStore((state) => state.reportDir)

  const settings = useSettingsStore((state) => state.settings)
  const originalsDir =
    jobMode === JOB_MODES.BY_IMAGE
      ? settings[SETTING_KEYS.BASE_FOLDER_OF_ORIGINAL_IMAGES]
      : settings[SETTING_KEYS.BASE_FOLDER_OF_ORIGINAL_VIDEOS]
  const optimizedDir =
    jobMode === JOB_MODES.BY_IMAGE
      ? settings[SETTING_KEYS.BASE_FOLDER_OF_OPTIMIZED_IMAGES]
      : settings[SETTING_KEYS.BASE_FOLDER_OF_VIDEOS]

  /* Specific-state for Multi-Day Import */
  const [selectedFolders, setSelectedFolders] = useState([])
  const [fileCounts, setFileCounts] = useState({})
  const addFolder = async (folderPath) => {
    setSelectedFolders([...selectedFolders, folderPath])
    const countsPerType = await ingestAPI.countFiles(folderPath)
    const relevantCount = countsPerType[`${jobMode}s`]
    setFileCounts({ ...fileCounts, [folderPath]: relevantCount })
  }

  // When the modal is opened, clear any previous state
  const previouslyOpen = usePrevious(multiDayImportOpen)
  useEffect(() => {
    if (previouslyOpen === false && multiDayImportOpen === true) {
      setSelectedFolders([])
      setFileCounts({})
    }
  }, [multiDayImportOpen])

  const canQueue = selectedFolders.length > 0

  return (
    <Dialog
      open={multiDayImportOpen}
      fullWidth
      maxWidth="md"
      disablePortal
      disableEscapeKeyDown
      sx={{
        position: 'aboslute',
        top: `${TITLEBAR_HEIGHT}px`,
      }}
      slotProps={{
        backdrop: {
          sx: { top: `${TITLEBAR_HEIGHT}px` },
        },
      }}
    >
      <DialogTitle>Multi-Day Import - {titleCase(jobMode)} files</DialogTitle>

      <DialogContent
        sx={{ minHeight: '50vh', overflowX: 'auto', display: 'flex', gap: 2, overflowY: 'hidden' }}
      >
        <Box sx={propertyContainerStyles('dashed')}>
          <Box sx={{ fontSize: '18px', fontWeight: 500 }}>Template Job Properties</Box>
          <PropertyLine label="Original Folder Name" value={leafPath(sourceFolder)} />
          <PropertyLine label="Output Observer Code" value={observerCode} />
          <PropertyLine label={`Original ${jobMode}s copied to`} value={originalsDir} longText />
          <PropertyLine label={`Optimized ${jobMode}s exported to`} value={optimizedDir} longText />
          {jobMode === JOB_MODES.BY_IMAGE && localOutputFolder && (
            <PropertyLine
              label={`Optimized ${jobMode}s locally exported to`}
              value={localOutputFolder}
              longText
            />
          )}
          {reportDir && (
            <PropertyLine label="Report CSV auto-exported to" value={reportDir} longText />
          )}
        </Box>

        <Box sx={propertyContainerStyles()}>
          <Box
            sx={{
              fontSize: '18px',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            New Job Folders
            <StyledPillButton
              onClick={async () => {
                const filePath = await window.api.selectFile(FILE_TYPES.FOLDER, sourceFolder)
                if (!filePath) return
                addFolder(filePath)
              }}
            >
              Add <AddIcon sx={{ marginLeft: 0.5, fontSize: '20px' }} />
            </StyledPillButton>
          </Box>
          <Box sx={{ marginTop: 0.5, height: '100%', overflowX: 'auto' }}>
            <MultiImportFolderList
              jobMode={jobMode}
              selectedFolders={selectedFolders}
              setSelectedFolders={setSelectedFolders}
              fileCounts={fileCounts}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          margin: 0,
          padding: 1.5,
        }}
      >
        <StyledButton onClick={confirmThenClose} color="plain">
          Close
        </StyledButton>
        <StyledButton color="primary" variant="contained" disabled={!canQueue} onClick={() => null}>
          Queue New Jobs
        </StyledButton>
      </DialogActions>
    </Dialog>
  )
}

export default MultiDayImportDialog
