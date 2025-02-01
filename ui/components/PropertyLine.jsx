import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'

const PropertyLine = ({ label, value, longText = false }) => {
  const scrollComponent = useRef(null)

  useEffect(() => {
    if (!longText) return
    const element = scrollComponent.current
    element.scrollTo({
      left: element.scrollWidth,
    })
  }, [])

  return (
    <Box>
      <Box sx={{ fontSize: '14px', color: 'text.secondary' }}>{label}</Box>
      <Box
        ref={scrollComponent}
        sx={(theme) => ({
          fontFamily: theme.typography.monoFamily,
          ...(longText
            ? {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                overflowX: 'scroll',
                paddingLeft: 1,
                paddingRight: 1,
                boxShadow: `
                  inset 20px -10px 30px -20px rgba(0,0,0,0.3),
                  inset -20px -10px 30px -20px rgba(0,0,0,0.3)
                `,
              }
            : {}),
        })}
      >
        {value}
      </Box>
    </Box>
  )
}

export default PropertyLine
