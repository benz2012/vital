import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone'

import JobQueueSidePad from './JobQueueSidePad'

const ALL_CODES = 'All Observer Codes'
const ONE_CODE = 'One Observer Code'

const FlowSheetPad = ({
  open,
  onClose,
  parent,
  observerCodes,
  onExport,
  latestFlowSheet,
  setLatestFlowSheet,
}) => {
  const [selectionMode, setSelectionMode] = useState(ALL_CODES)
  const [selectedCode, setSelectedCode] = useState(null)

  useEffect(() => {
    if (observerCodes.length > 0 && selectedCode === null) {
      setSelectedCode(observerCodes[0])
    }
  }, [JSON.stringify(observerCodes)])

  const [exporting, setExporting] = useState(false)
  const triggerExport = async () => {
    setExporting(true)
    const exportArg = selectionMode === ALL_CODES ? 'ALL_CODES' : selectedCode
    const result = await onExport(exportArg)
    setExporting(false)
    setLatestFlowSheet(result)
  }

  const cleanupAndClose = () => {
    setExporting(false)
    onClose()
  }

  const exportText = exporting ? 'Exporting...' : 'Export to a Folder'

  return (
    <JobQueueSidePad
      open={open}
      onClose={cleanupAndClose}
      parent={parent}
      width={400}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
      displayCloseButton
    >
      <Box sx={{ width: '90%' }}>Export PA Flow Sheet as a CSV</Box>

      <Box sx={{ width: '90%', fontSize: '14px', color: 'text.secondary' }}>
        Export a plain CSV file representing a summary of multiple <strong>completed</strong> VITAL
        jobs, which can be easily copy-pasted into a Photo Analysis Flow Sheet.
      </Box>

      <RadioGroup
        value={selectionMode}
        onChange={(event) => setSelectionMode(event.target.value)}
        sx={{ marginLeft: 0.5 }}
      >
        <FormControlLabel
          label={ALL_CODES}
          value={ALL_CODES}
          control={<Radio size="small" sx={{ padding: '4px' }} />}
          sx={{
            color: selectionMode === ALL_CODES ? 'primary.main' : 'text.primary',
          }}
          slotProps={{
            typography: {
              sx: { marginLeft: 0.5 },
            },
          }}
        />
        <FormControlLabel
          label={ONE_CODE}
          value={ONE_CODE}
          control={<Radio size="small" sx={{ padding: '4px' }} />}
          sx={{
            color: selectionMode === ONE_CODE ? 'primary.main' : 'text.primary',
          }}
          slotProps={{
            typography: {
              sx: { marginLeft: 0.5 },
            },
          }}
        />
      </RadioGroup>

      <FormControl size="small" sx={{ width: '200px', marginLeft: 2, marginTop: -1 }}>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={selectedCode}
          onChange={(event) => setSelectedCode(event.target.value)}
          disabled={selectionMode === ALL_CODES}
        >
          {observerCodes.map((code) => (
            <MenuItem key={code} value={code} dense>
              {code}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {latestFlowSheet && (
        <Box>
          <Box sx={{ display: 'flex', color: 'tertiary.main', gap: 0.5 }}>
            Most recently exported to
            <FileDownloadDoneIcon sx={{ marginLeft: '-4px' }} />
          </Box>
          <Box
            sx={(theme) => ({
              fontFamily: theme.typography.monoFamily,
              fontSize: '14px',
              wordBreak: 'break-all',
            })}
          >
            {latestFlowSheet}
          </Box>
        </Box>
      )}

      <Box sx={{ marginTop: 1, alignSelf: 'flex-end' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={triggerExport}
          sx={{ textTransform: 'none' }}
          disabled={exporting}
        >
          {exportText}
        </Button>
      </Box>
    </JobQueueSidePad>
  )
}

export default FlowSheetPad
