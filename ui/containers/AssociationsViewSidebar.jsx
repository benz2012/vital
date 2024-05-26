import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import Box from '@mui/material/Box'

import useStore from '../store'
import { getViewSuffix } from '../store/associations-view'
import { baseURL } from '../api/config'

import Sidebar from '../components/Sidebar'
import StyledSelect from '../components/StyledSelect'
import LinkageListItem from '../components/LinkageListItem'

const AssociationsViewSidebar = () => {
  const [viewYear, setViewYear] = useStore(
    useShallow((state) => [state.viewYear, state.setViewYear])
  )
  const [viewSuffix, setViewSuffix] = useStore(
    useShallow((state) => [state.viewSuffix, state.setViewSuffix])
  )

  const sightings = useStore((state) => state.sightings)
  const sightingYears = [...new Set(sightings.map((sighting) => sighting.year))]
  const sightingSuffixes = [...new Set(sightings.map(getViewSuffix))]
  sightingSuffixes.sort((a, b) => a.localeCompare(b))

  // Linkage Data Handling
  const linkages = useStore((state) => state.linkages)
  const loadLinkages = useStore((state) => state.loadLinkages)
  useEffect(() => {
    // Set Default Options as initial reaction to them being available
    if (viewYear == null) {
      setViewYear(sightingYears[0])
    }
    if (viewSuffix == null) {
      setViewSuffix(sightingSuffixes[0])
    }

    loadLinkages()
  }, [viewYear, viewSuffix])

  return (
    <Sidebar>
      <Box
        sx={(theme) => ({
          width: `calc(100% + ${theme.spacing(2)})`,
          margin: -1,
          padding: `${theme.spacing(1)} ${theme.spacing(1)} ${theme.spacing(0)} ${theme.spacing(1)}`,
          color: 'black',
          backgroundColor: 'background.headerPaper',
          display: 'flex',
          flexDirection: 'column',
        })}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: '90px' }}>
            {viewYear && (
              <StyledSelect
                label="Year"
                value={viewYear}
                handleChange={(event) => setViewYear(event.target.value)}
                options={sightingYears}
              />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            {viewSuffix && (
              <StyledSelect
                label="Viewing"
                value={viewSuffix}
                handleChange={(event) => setViewSuffix(event.target.value)}
                options={sightingSuffixes}
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            marginTop: '2px',
            marginBottom: '2px',
            alignSelf: 'flex-end',
            opacity: '0.75',
          }}
        >
          {linkages.length} Associations
        </Box>
      </Box>

      <Box sx={{ marginRight: -1, overflowY: 'scroll' }}>
        {linkages.map((linkage) => (
          <LinkageListItem
            key={linkage.id}
            id={linkage.id}
            regionStart={linkage.regionStart}
            regionEnd={linkage.regionEnd}
            sighting={linkage.sighting}
            frameRate={linkage.video.frameRate}
            thumbnail={`${baseURL}/thumbnails/${encodeURIComponent(linkage.thumbnail)}`}
          />
        ))}
      </Box>
    </Sidebar>
  )
}

export default AssociationsViewSidebar
