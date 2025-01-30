import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ReportIcon from '@mui/icons-material/Report'

import StyledTooltip from './StyledTooltip'
import { RENAME_DEFAULTS } from '../store/job'

const INFO_ROWS = [
  ['trimStart', 'trimEnd'],
  ['prefix', 'suffix'],
  ['insertText', 'insertAt'],
  ['findString', 'replaceString'],
]

const BatchRenameList = ({
  batchRenameRules,
  removeBatchRenameRuleset,
  batchRenameRulesValidated,
}) => {
  const renderRulesetInfo = (ruleset) => {
    const statefulRuleData = Object.entries(ruleset)
      .filter(([key]) => ['id', 'filePaths'].includes(key) === false)
      .filter(([key, value]) => {
        if (key === 'insertAt') {
          return ruleset.insertText !== RENAME_DEFAULTS.insertText
        }
        if (key === 'replaceString') {
          return ruleset.findString !== RENAME_DEFAULTS.findString
        }
        return value !== RENAME_DEFAULTS[key]
      })
    return (
      <Box>
        {INFO_ROWS.map((keysInRow) => {
          const row = statefulRuleData.filter(([key]) => keysInRow.includes(key))
          return (
            <Box
              key={`${keysInRow}`}
              sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}
            >
              {row.map(([key, value]) => (
                <Box key={key}>
                  {key}: {value}
                </Box>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, userSelect: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        Applied Renames{' '}
        {!batchRenameRulesValidated && (
          <StyledTooltip title="Invalid rule combination" darker>
            <ReportIcon sx={{ color: 'error.main', fontSize: '20px' }} />
          </StyledTooltip>
        )}
      </Box>
      {batchRenameRules.length === 0 && <Box sx={{ fontStyle: 'italic' }}>None</Box>}
      {batchRenameRules.map((ruleset, index) => (
        <Box
          key={ruleset.id}
          sx={(theme) => ({
            padding: 0.5,
            paddingLeft: 1,
            border: `1px solid ${theme.palette.secondary.dark}`,
            backgroundColor: theme.palette.secondary.dark25,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ...(!batchRenameRulesValidated && index === batchRenameRules.length - 1
              ? {
                  backgroundColor: '#D32F2F40',
                  border: `1px solid ${theme.palette.error.light}`,
                }
              : {}),
          })}
        >
          <Box sx={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 500 }}>Rename</Box>

          <StyledTooltip title={renderRulesetInfo(ruleset)} darker>
            <Box
              sx={(theme) => ({
                fontFamily: theme.typography.monoFamily,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              })}
            >
              {ruleset.id.slice(ruleset.id.length - 6)}
              <InfoOutlinedIcon sx={{ fontSize: '16px' }} />
            </Box>
          </StyledTooltip>

          <Box sx={{ color: 'text.secondary' }}>
            applied to{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {ruleset.filePaths.length || 'All'}
            </Box>{' '}
            files
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            onClick={() => removeBatchRenameRuleset(ruleset.id)}
          >
            <DeleteForeverIcon sx={{ fontSize: '20px' }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  )
}

export default BatchRenameList
