import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone'

import JobQueueSidePad from './JobQueueSidePad'
import { bytesToSize, completionTimeString } from '../utilities/strings'

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000

const monoStyle = (theme) => ({
  fontFamily: theme.typography.monoFamily,
  fontSize: '14px',
})

const JobReportPad = ({
  open,
  onClose,
  parent,
  jobId,
  jobName,
  completedAt,
  data,
  onExport,
  reloadJob,
}) => {
  const olderThan10Days = new Date() - new Date(completedAt) > TEN_DAYS

  const [exporting, setExporting] = useState(false)
  const [exportSucccess, setExportSuccess] = useState(false)
  const triggerExport = async () => {
    setExporting(true)
    const result = await onExport()
    setExporting(false)
    setExportSuccess(result)

    if (result) {
      // Reload the report data to show the successful export file path
      reloadJob(jobId)
    }
  }
  useEffect(() => {
    setExportSuccess(false)
  }, [JSON.stringify(data)])

  let exportText = 'Export Report CSV'
  if (olderThan10Days) {
    exportText = 'Export Not Available'
  } else if (exporting) {
    exportText = 'Exporting...'
  } else if (exportSucccess) {
    // We will give the user unlimited attempts to download the CSV, even if it was successful
  }

  return (
    <JobQueueSidePad
      open={open}
      onClose={onClose}
      parent={parent}
      width={450}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
      displayCloseButton
    >
      <Box
        sx={(theme) => ({
          width: '90%',
          fontFamily: theme.typography.monoFamily,
        })}
      >
        <Box component="span" sx={{ color: 'primary.main' }}>
          Job Report
        </Box>
        <br />
        {jobName}
        <br />
        <Box component="span" sx={{ fontSize: '14px', color: 'text.secondary' }}>
          Completed on {completionTimeString(completedAt)}
        </Box>
      </Box>

      <Box>
        <Box sx={{ color: 'text.secondary' }}>Source Folder</Box>
        <Box sx={monoStyle}>{data.source_folder_path}</Box>
        <Box sx={monoStyle}>Total Size: {bytesToSize(data.source_folder_size)}</Box>
        <Box sx={monoStyle}>{data.source_folder_media_count} files</Box>
      </Box>

      <Box>
        <Box sx={{ color: 'text.secondary' }}>Originals Output</Box>
        <Box sx={monoStyle}>{data.original_folder_path}</Box>
        <Box sx={monoStyle}>Total Size: {bytesToSize(data.original_folder_size)}</Box>
        <Box sx={monoStyle}>{data.original_folder_media_count} files</Box>
      </Box>

      <Box>
        <Box sx={{ color: 'text.secondary' }}>Optimized Output</Box>
        <Box sx={monoStyle}>{data.optimized_folder_path}</Box>
        <Box sx={monoStyle}>Total Size: {bytesToSize(data.optimized_folder_size)}</Box>
        <Box sx={monoStyle}>{data.optimized_folder_media_count} files</Box>
      </Box>

      {data.output_file && (
        <Box>
          <Box sx={{ display: 'flex', color: 'tertiary.main', gap: 0.5 }}>
            Most recently exported to
            <FileDownloadDoneIcon sx={{ marginLeft: '-4px' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={monoStyle}>{data.output_file}</Box>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={triggerExport}
          sx={{ textTransform: 'none' }}
          disabled={exporting || olderThan10Days}
        >
          {exportText}
        </Button>
        <Box sx={{ color: 'text.secondary', fontSize: '14px', lineHeight: '14px' }}>
          CSV available for 10 days
        </Box>
      </Box>
    </JobQueueSidePad>
  )
}

export default JobReportPad
