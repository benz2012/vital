import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import TinyTextButton from './TinyTextButton'

const BatchRenameController = ({
  oneFileName,
  oneNewName,
  batchRenameRules,
  setOneBatchRenameRule,
  applyBatchRenameRules,
  selectedRows,
  clearRowSelection,
}) => {
  return (
    <>
      <Box sx={{ fontSize: '20px' }}>
        Batch Rename Files
        <Box sx={(theme) => ({ fontFamily: theme.typography.monoFamily, fontSize: '12px' })}>
          Example:
          <br />
          <Box component="span" sx={{ color: 'text.disabled' }}>
            {oneFileName}
          </Box>
          &nbsp;&nbsp;→
          <br />
          {oneNewName}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          paddingTop: 0.5,
          marginTop: -0.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Trim Start"
            type="number"
            size="small"
            color="secondary"
            value={batchRenameRules.trimStart}
            onChange={(event) => setOneBatchRenameRule('trimStart', event.target.value)}
          />
          <TextField
            label="Trim End"
            type="number"
            color="secondary"
            size="small"
            value={batchRenameRules.trimEnd}
            onChange={(event) => setOneBatchRenameRule('trimEnd', event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Add Prefix"
            size="small"
            color="secondary"
            value={batchRenameRules.prefix}
            onChange={(event) => setOneBatchRenameRule('prefix', event.target.value)}
          />
          <TextField
            label="Add Suffix"
            size="small"
            color="secondary"
            value={batchRenameRules.suffix}
            onChange={(event) => setOneBatchRenameRule('suffix', event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Insert Text"
            size="small"
            color="secondary"
            value={batchRenameRules.insertText}
            onChange={(event) => setOneBatchRenameRule('insertText', event.target.value)}
          />
          <TextField
            label="Insert At"
            type="number"
            size="small"
            color="secondary"
            value={batchRenameRules.insertAt}
            onChange={(event) => setOneBatchRenameRule('insertAt', event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Find"
            size="small"
            color="secondary"
            value={batchRenameRules.findString}
            onChange={(event) => setOneBatchRenameRule('findString', event.target.value)}
          />
          <TextField
            label="Replace With"
            size="small"
            color="secondary"
            value={batchRenameRules.replaceString}
            onChange={(event) => setOneBatchRenameRule('replaceString', event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{ alignSelf: 'flex-end', color: 'white' }}
            disableElevation
            onClick={applyBatchRenameRules}
            disabled={batchRenameRules.applied}
          >
            {batchRenameRules.applied ? 'Rules Applied' : 'Apply Rules'}
          </Button>
          <Box sx={{ fontWeight: 300 }}>
            {selectedRows.length === 0 ? (
              <>
                to{' '}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  All
                </Box>{' '}
                rows
              </>
            ) : (
              <>
                to{' '}
                <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                  {selectedRows.length}
                </Box>{' '}
                selected rows
              </>
            )}
          </Box>
          {selectedRows.length > 0 && (
            <TinyTextButton onClick={clearRowSelection}>clear &times;</TinyTextButton>
          )}
        </Box>
      </Box>
    </>
  )
}

export default BatchRenameController
