import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'

import StyledButton from './StyledButton'

const PhaseTriggerSection = ({
  actionName,
  canTrigger,
  onTriggerAction,
  multiDayImport,
  setMultiDayImport,
  showMultiDayImport = false,
}) => (
  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
    <Box sx={{ display: 'flex' }}>
      <StyledButton
        variant="outlined"
        fullWidth
        disabled={!canTrigger}
        onClick={onTriggerAction}
        sx={{ flexGrow: 1 }}
      >
        {actionName}
      </StyledButton>
      {showMultiDayImport && (
        <Box
          sx={{
            width: '72px',
            paddingLeft: 1,
            marginTop: -0.25,
            marginBottom: -1,
            fontSize: '14px',
            lineHeight: '16px',
            textAlign: 'center',
          }}
        >
          multi-day import
          <Switch
            size="small"
            checked={multiDayImport}
            onChange={(event) => setMultiDayImport(event.target.checked)}
            sx={{ marginRight: 0.5 }}
          />
        </Box>
      )}
    </Box>
  </Box>
)

export default PhaseTriggerSection
