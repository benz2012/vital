import { useTheme } from '@mui/material'
import Box from '@mui/material/Box'

import { megabytes } from '../utilities/numbers'

const TICK_WIDTH = 60
const VISUAL_FONT_HEIGHT = 18
const ALL_BIN_RANGES = [
  [-1, megabytes(1)],
  [megabytes(1), megabytes(3)],
  [megabytes(3), megabytes(10)],
  [megabytes(10), megabytes(30)],
  [megabytes(30), megabytes(100)],
  [megabytes(100), megabytes(300)],
  [megabytes(300), megabytes(1000)],
]

const verticalChartColumnStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  flexGrow: 0,
  flexShrink: 0,
}

const FilesizeSwarmHistogram = ({ sizesBefore, sizesAfter }) => {
  const theme = useTheme()

  const maxSize = Math.max(...sizesBefore, ...sizesAfter)
  const binRanges = ALL_BIN_RANGES.filter(([min]) => min < maxSize)

  const makeBlankBin = () => binRanges.map(() => 0)
  const binReducer = (bins, entry) => {
    const binIndex = binRanges.findIndex(([min, max], index) => {
      if (index === binRanges.length - 1) {
        // Place all large values in the last bin
        return entry > min
      }
      return entry > min && entry <= max
    })
    bins[binIndex] += 1
    return bins
  }

  const binsBefore = sizesBefore.reduce(binReducer, makeBlankBin()).reverse()
  const binsAfter = sizesAfter.reduce(binReducer, makeBlankBin()).reverse()
  const maxCount = Math.max(...binsBefore, ...binsAfter)

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexGrow: 0,
        flexShrink: 0,
        fontFamily: theme.typography.monoFamily,
        fontSize: '12px',
      }}
    >
      {/* Tick Labels and Grid Lines */}
      <Box
        sx={{
          ...verticalChartColumnStyles,
          marginTop: `-${VISUAL_FONT_HEIGHT / 2}px`,
          paddingRight: 1,
          width: `${TICK_WIDTH}px`,
          alignItems: 'flex-end',
          color: theme.palette.text.secondary,
        }}
      >
        {[[0, 0], ...binRanges].reverse().map(([, max], index) => {
          const labelNum = Math.round(max / megabytes(1))
          let label = `${labelNum} MB`
          if (labelNum === 1000) {
            label = '1 GB +'
          }
          return (
            <Box key={index}>
              {label}
              <Box
                sx={{
                  position: 'absolute',
                  width: `calc(100% - ${TICK_WIDTH}px)`,
                  borderBottom: `1px solid ${theme.palette.action.hover}`,
                  right: 0,
                  transform: `translateY(-${VISUAL_FONT_HEIGHT / 2 + 1}px)`,
                }}
              />
            </Box>
          )
        })}
      </Box>

      {/* Horizontal Histogram Bars, Vertically Stacked, for 2 Data Sets, side-by-side */}
      {[binsBefore, binsAfter].map((bins, column) => (
        <Box
          key={column}
          sx={{
            ...verticalChartColumnStyles,
            width: `calc(50% - ${TICK_WIDTH / 2}px)`,
            alignItems: 'center',
          }}
        >
          {bins.map((count, row) => (
            <Box
              key={`${count}-${row}`}
              sx={{
                width: `${Math.floor((count / maxCount) * 100)}%`,
                backgroundColor:
                  column === 0 ? 'rgba(255, 255, 255, 0.2)' : theme.palette.primary.dark,
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {count}
            </Box>
          ))}
          {/* Column Labels */}
          <Box sx={{ marginTop: '2px', color: theme.palette.text.secondary }}>
            {column === 0 ? 'Original' : 'Optimized'} Files
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default FilesizeSwarmHistogram
