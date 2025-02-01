import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import { processRenameRulesetAgainstString } from '../utilities/strings'
import { RENAME_DEFAULTS } from '../store/job'
import TinyTextButton from './TinyTextButton'

const BatchRenameController = ({
  oneFileName,
  addBatchRenameRuleset,
  selectedRows = [],
  clearRowSelection,
}) => {
  const [currentRuleset, setCurrentRuleset] = useState(RENAME_DEFAULTS)
  const isDefaultState = Object.entries(currentRuleset).every(
    ([key, value]) => RENAME_DEFAULTS[key] === value
  )
  const setOneRule = (ruleKey) => (event) =>
    setCurrentRuleset((prev) => ({ ...prev, [ruleKey]: event.target.value }))

  // Demo the current rules against a filename to show the user what will happen
  const oneNewName = processRenameRulesetAgainstString(currentRuleset, oneFileName)

  const handleApply = () => {
    addBatchRenameRuleset({
      id: window.crypto.randomUUID(),
      filePaths: selectedRows,
      ...currentRuleset,
    })
    setCurrentRuleset(RENAME_DEFAULTS)
  }

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
            value={currentRuleset.trimStart}
            onChange={setOneRule('trimStart')}
          />
          <TextField
            label="Trim End"
            type="number"
            color="secondary"
            size="small"
            value={currentRuleset.trimEnd}
            onChange={setOneRule('trimEnd')}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Add Prefix"
            size="small"
            color="secondary"
            value={currentRuleset.prefix}
            onChange={setOneRule('prefix')}
          />
          <TextField
            label="Add Suffix"
            size="small"
            color="secondary"
            value={currentRuleset.suffix}
            onChange={setOneRule('suffix')}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Insert Text"
            size="small"
            color="secondary"
            value={currentRuleset.insertText}
            onChange={setOneRule('insertText')}
          />
          <TextField
            label="Insert At"
            type="number"
            size="small"
            color="secondary"
            value={currentRuleset.insertAt}
            onChange={setOneRule('insertAt')}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Find"
            size="small"
            color="secondary"
            value={currentRuleset.findString}
            onChange={setOneRule('findString')}
          />
          <TextField
            label="Replace With"
            size="small"
            color="secondary"
            value={currentRuleset.replaceString}
            onChange={setOneRule('replaceString')}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{ alignSelf: 'flex-end', color: 'white' }}
            disableElevation
            onClick={handleApply}
            disabled={isDefaultState}
          >
            Apply Rules
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
