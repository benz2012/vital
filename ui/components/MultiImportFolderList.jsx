import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'

import { leafPath } from '../utilities/paths'
import StyledTooltip from './StyledTooltip'

const MultiImportFolderList = ({
  jobMode,
  selectedFolders,
  removeFolder,
  fileCounts,
  invalidFolders,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        userSelect: 'none',
      }}
    >
      {selectedFolders.length === 0 && <Box sx={{ fontStyle: 'italic' }}>None</Box>}
      {selectedFolders.map((folderPath) => (
        <Box
          key={folderPath}
          sx={(theme) => ({
            padding: 0.5,
            paddingLeft: 1,
            border: `1px solid ${theme.palette.secondary.dark}`,
            backgroundColor: theme.palette.secondary.dark25,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            ...(invalidFolders.includes(folderPath) || fileCounts?.[folderPath] === 0
              ? {
                  backgroundColor: '#D32F2F40',
                  border: `1px solid ${theme.palette.error.light}`,
                }
              : {}),
          })}
        >
          <StyledTooltip
            title={
              <Box component="span" sx={(theme) => ({ fontFamily: theme.typography.monoFamily })}>
                {invalidFolders.includes(folderPath)
                  ? 'not in format YYYY-MM-DD-ObserverCode'
                  : folderPath}
              </Box>
            }
            darker
            placement="top"
          >
            <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily })}>
              {leafPath(folderPath)}
            </Box>
          </StyledTooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ color: 'text.secondary', marginRight: 1 }}>
            with{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {fileCounts?.[folderPath] ?? '?'}
            </Box>{' '}
            {jobMode}s
          </Box>

          <StyledTooltip title="Remove folder" darker>
            <IconButton
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              onClick={() => removeFolder(folderPath)}
            >
              <RemoveCircleOutlineIcon sx={{ fontSize: '20px' }} />
            </IconButton>
          </StyledTooltip>
        </Box>
      ))}
    </Box>
  )
}

export default MultiImportFolderList
