import { useState, useRef, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import throttle from 'lodash.throttle'

const LINE_HEIGHT = 4
const LETTERS_CONTAINER_WIDTH = 16

const VideoTimeline = ({
  bufferedRegions, // array of [start, end] of unit frames, sorted by start
  existingRegions, // array of { letter, start, end } of unit frames
  regionStart, // unit frames
  regionEnd, // unit frames
  videoDuration: videoDurationProp, // unit frames
  currentFrameNumber, // unit frames
  seekToFrame,
}) => {
  const videoDuration = videoDurationProp || 1 // prevent division by zero

  // Lock playhead at 0 in edge case scenarios
  const playheadPosition = videoDurationProp === 0 ? 0 : (currentFrameNumber / videoDuration) * 100
  const regionStartPosition = (regionStart / videoDuration) * 100
  const regionEndPosition = (regionEnd / videoDuration) * 100
  const accountForPlayheadWidthNearRightEdge = playheadPosition > 50 ? 2 : 0

  // NOTE: We assume that all letters belong to the same sighting prefix (Year/Month/Day/Observer)
  const existingLetters = [...new Set(existingRegions.map((region) => region.letter))]
  existingLetters.sort()
  const letterToTrackMap = existingLetters.reduce((acc, letter) => {
    if (letter in acc) return acc
    acc[letter] = Object.keys(acc).length
    return acc
  }, {})

  const containerRef = useRef(null)

  const seekToPointerEvent = (event) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const xOffset = event.clientX - rect.x
    const xPercent = xOffset / rect.width
    const seekTo = xPercent * videoDuration
    seekToFrame(seekTo)
  }

  const [showClickLine, setShowClickLine] = useState(false)
  const [clickLineXPercent, setClickLineXPercent] = useState(null)
  const setClickLine = (event) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const xOffset = event.clientX - rect.x
    const xPercent = (xOffset / rect.width) * 100
    setClickLineXPercent(xPercent)
  }

  const existingRegionsContainerRef = useRef(null)
  const scrollbarWidth = (() => {
    const containerEl = existingRegionsContainerRef.current
    if (!containerEl) return 0
    return containerEl.offsetWidth - containerEl.clientWidth
  })()
  const TIMELINE_LEFT_INSET = scrollbarWidth + LETTERS_CONTAINER_WIDTH

  const [isDragging, setIsDragging] = useState(false)
  const dragToSeek = useCallback(
    throttle((event) => {
      seekToPointerEvent(event)
    }, 100),
    [videoDuration]
  )

  const handlePointerMove = (event) => {
    setShowClickLine(true)
    setClickLine(event)
    if (isDragging) {
      dragToSeek(event)
    }
  }

  const handlePointerUp = () => {
    dragToSeek.cancel()
    setIsDragging(false)
  }

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'background.paper',
        position: 'relative',
        overflowX: 'clip',
        overflowY: 'visible',
      }}
    >
      {/* Existing Regions */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '100%',
          direction: 'rtl',
          overflowY: 'scroll',
        }}
        ref={existingRegionsContainerRef}
      >
        <Box
          sx={{
            // This container is already pushed left by the scrollbar, so we only need to
            // push it further left by the letters container width
            width: `calc(100% - ${LETTERS_CONTAINER_WIDTH}px)`,
            height: '100%',
            marginLeft: `${LETTERS_CONTAINER_WIDTH}px`,
            position: 'relative',
          }}
        >
          {existingRegions.map((region) => {
            const { letter, start, end } = region
            const track = letterToTrackMap[letter]
            return (
              <Box
                key={`${letter}-${start}-${end}`}
                sx={{
                  position: 'absolute',
                  top: `calc(${track * 10}px + 6px)`,
                  left: `${(start / videoDuration) * 100}%`,
                  width: `${((end - start) / videoDuration) * 100}%`,
                  height: `${LINE_HEIGHT}px`,
                  backgroundColor: 'tertiary.main',
                }}
              />
            )
          })}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: `calc(${existingLetters.length * 10}px + 6px)`,
            width: `${LINE_HEIGHT}px`,
            height: `${LINE_HEIGHT}px`,
            backgroundColor: 'transparent',
          }}
        />
      </Box>

      {/* Interactive Area */}
      <Box
        sx={{
          width: `calc(100% - ${TIMELINE_LEFT_INSET}px)`,
          height: '100%',
          marginLeft: `${TIMELINE_LEFT_INSET}px`,
          position: 'relative',
        }}
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setShowClickLine(false)}
      >
        {/* Clickable Scrubber/Seeker */}
        <Box sx={{ width: '100%', height: '100%' }} onClick={seekToPointerEvent} />
        {showClickLine && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: `${clickLineXPercent}%`,
              width: '2px',
              height: '100%',
              backgroundColor: 'secondary.main',
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Current Region */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 'calc(5% + 4px)',
            left: `${regionStartPosition}%`,
            width: `calc(${regionEndPosition - regionStartPosition}%)`,
            height: 'calc(90% - 4px)',
            backgroundColor: 'tertiary.dark',
            opacity: 0.1,
            borderRadius: '4px',
            visibility: regionStart == null || regionEnd == null ? 'hidden' : 'visible',
          }}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            bottom: 'calc(5% + 4px)',
            left: `${regionStartPosition}%`,
            width: '6px',
            height: 'calc(90% - 4px)',
            border: `2px solid ${theme.palette.tertiary.dark}`,
            borderRight: 'none',
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
            visibility: regionStart == null ? 'hidden' : 'visible',
          })}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            bottom: 'calc(5% + 4px)',
            left: `calc(${regionEndPosition}% - 4px)`,
            width: '6px',
            height: 'calc(90% - 4px)',
            border: `2px solid ${theme.palette.tertiary.dark}`,
            borderLeft: 'none',
            borderTopRightRadius: '4px',
            borderBottomRightRadius: '4px',
            visibility: regionEnd == null ? 'hidden' : 'visible',
          })}
        />

        {/* Buffer Bar */}
        {bufferedRegions.map((region, index) => {
          const [start, end] = region
          return (
            <Box
              key={`${index}`}
              sx={(theme) => ({
                position: 'absolute',
                bottom: 0,
                left: `${(start / videoDuration) * 100}%`,
                width: `${((end - start) / videoDuration) * 100}%`,
                height: `${LINE_HEIGHT}px`,
                backgroundColor: 'action.selected',
                transition: `width ${theme.transitions.duration.shortest}ms ease-in-out`,
              })}
            />
          )
        })}

        {/* Playhead */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: `calc(${playheadPosition}% - ${accountForPlayheadWidthNearRightEdge}px)`,
            width: '2px',
            height: '100%',
            backgroundColor: 'secondary.main',
          }}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            bottom: 0,
            left: `calc(${playheadPosition}% - 5px - ${accountForPlayheadWidthNearRightEdge}px)`,
            width: '0px',
            height: '0px',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `6px solid ${theme.palette.secondary.main}`,

            '&:hover': {
              width: '16px',
              height: '16px',
              border: `2px solid ${theme.palette.action.active}`,
              borderRadius: '8px',
              backgroundColor: theme.palette.secondary.main,
              transform: 'translate(-2px, 5px)',
              boxShadow: theme.shadows[4],
            },
          })}
          onPointerDown={() => setIsDragging(true)}
        />
        {isDragging && (
          <Box
            sx={(theme) => ({
              position: 'absolute',
              bottom: 0,
              left: `${clickLineXPercent}%`,
              width: '16px',
              height: '16px',
              border: `2px solid ${theme.palette.action.active}`,
              borderRadius: '8px',
              backgroundColor: theme.palette.secondary.main,
              transform: 'translate(-7px, 5px)',
              boxShadow: theme.shadows[4],
            })}
          />
        )}
      </Box>
    </Box>
  )
}

export default VideoTimeline
