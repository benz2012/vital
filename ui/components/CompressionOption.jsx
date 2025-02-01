import { useState } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import Box from '@mui/material/Box'
import Radio from '@mui/material/Radio'
import Button from '@mui/material/Button'

import { bytesToSize } from '../utilities/strings'

const IMAGE_WIDTH = 200

const Controls = ({ onExit }) => {
  const { zoomIn, zoomOut } = useControls()

  return (
    <Box
      sx={(theme) => ({
        position: 'fixed',
        top: theme.spacing(4),
        right: theme.spacing(1),
        display: 'flex',
        gap: 0.5,
      })}
    >
      <Button
        onClick={() => zoomIn()}
        size="small"
        variant="contained"
        color="inherit"
        sx={(theme) => ({
          fontSize: '12px',
          minWidth: theme.spacing(2.5),
        })}
      >
        +
      </Button>
      <Button
        onClick={() => zoomOut()}
        size="small"
        variant="contained"
        color="inherit"
        sx={(theme) => ({
          fontSize: '12px',
          minWidth: theme.spacing(2.5),
        })}
      >
        -
      </Button>
      <Button
        onClick={onExit}
        size="small"
        variant="contained"
        color="inherit"
        sx={{
          fontSize: '12px',
        }}
      >
        Exit Fullscreen
      </Button>
    </Box>
  )
}

const CompressionOption = ({
  image,
  compression,
  fileSize,
  savings,
  showSavings,
  selected,
  onClick,
  imageLoaded,
}) => {
  const savingsBytes = savings || 0
  const showSavingsLine = Boolean(showSavings)

  const [loaded, setLoaded] = useState(false)
  const onLoad = () => {
    setLoaded(true)
    imageLoaded()
  }

  const [fullscreen, setFullscreen] = useState(false)

  return (
    <Box
      sx={{
        padding: 0.5,
        borderRadius: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: `${IMAGE_WIDTH}px`,
          minHeight: `${IMAGE_WIDTH * 0.5625}px`,
          overflow: 'hidden',
          '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'calc(100% - 6px)',
            borderRadius: 0.5,

            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            zIndex: 1,
            opacity: 0,
            transition: 'opacity 0.15s',

            content: '"click to enlarge"',
            filter: `drop-shadow(0px 0px 8px rgba(0, 0, 0, 0.8))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          '&:hover': {
            '&::after': {
              opacity: 1,
            },
          },
        }}
        onClick={() => setFullscreen(true)}
      >
        {loaded === true ? null : (
          <Box
            sx={{
              position: 'absolute',
              width: `${IMAGE_WIDTH}px`,
              height: `${IMAGE_WIDTH * 0.5625}px`,
              backgroundColor: 'action.hover',
              borderRadius: 0.5,
              marginBottom: '6px',
            }}
          />
        )}
        <Box
          component="img"
          src={image}
          onLoad={onLoad}
          sx={{ width: `${IMAGE_WIDTH}px`, borderRadius: 0.5 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Radio
          size="small"
          checked={selected}
          onChange={(event) => onClick(event.target.checked)}
        />
        <Box sx={{ fontSize: '14px' }}>
          <Box sx={{ lineHeight: '16px' }}>{compression} compression</Box>
          <Box sx={{ lineHeight: '16px' }}>{fileSize} file size</Box>
          {showSavingsLine && (
            <Box sx={{ lineHeight: '16px' }}>
              Savings: {savingsBytes === 0 ? '' : '~'}
              {bytesToSize(savingsBytes)}
            </Box>
          )}
        </Box>
      </Box>

      {fullscreen === true && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <TransformWrapper maxScale={16}>
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <img src={image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </TransformComponent>
            <Controls onExit={() => setFullscreen(false)} />
          </TransformWrapper>
        </Box>
      )}
    </Box>
  )
}

export default CompressionOption
