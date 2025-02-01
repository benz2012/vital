import Box from '@mui/material/Box'
import { Typography } from '@mui/material'

import openFolderIcon from '../assets/open-folder-64.png'
import { blackPixelToTheme } from '../theme'

const SidebarHeader = ({ title, titleAddendum, subtitle }) => (
  <Box
    sx={{
      width: '100%',
      padding: 1,
      borderRadius: 1,
      backgroundColor: 'primary.light',
      color: 'primary.dark',
    }}
  >
    <Typography sx={{ lineHeight: '16px', marginBottom: 0.5 }}>{subtitle}</Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        overflowX: 'clip',
        overflowY: 'visible',
        wordBreak: 'break-all',
      }}
    >
      <img
        src={openFolderIcon}
        alt="open folder"
        style={{
          width: '24px',
          height: '24px',
          filter: blackPixelToTheme.palette.primary.dark,
          userSelect: 'none',
        }}
      />
      <Typography sx={{ fontSize: '24px', lineHeight: '24px', fontWeight: 700 }}>
        {title}
        {titleAddendum && (
          <Typography component="span" sx={{ display: 'block', lineHeight: '16px' }}>
            {titleAddendum}
          </Typography>
        )}
      </Typography>
    </Box>
  </Box>
)

export default SidebarHeader
