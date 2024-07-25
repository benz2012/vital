import { useState } from 'react'
import Box from '@mui/material/Box'

import TOOLS from '../constants/tools'
import ROUTES from '../constants/routes'

import useStore from '../store'
import useJobStore from '../store/job'
import ToolButton from '../components/ToolButton'
import Sidebar from '../components/Sidebar'
import DescriptionBox from '../components/DescriptionBox'
import StyledButton from '../components/StyledButton'
import ChooseFolderBrowser from './ChooseFolderBrowser'
import ChooseIngestInputs from './ChooseIngestInputs'

const ToolsContainer = () => {
  const resetJobStore = useJobStore((state) => state.reset)

  const [tool, _setTool] = useState(TOOLS.INGEST_TRANSCODE)
  const setTool = (newTool) => {
    if (newTool !== TOOLS.INGEST_TRANSCODE) {
      resetJobStore()
    }
    _setTool(newTool)
  }

  const setRoute = useStore((state) => state.setRoute)
  const selectedFolderId = useStore((state) => state.selectedFolderId)
  const jobMode = useJobStore((state) => state.jobMode)

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Tool Selector */}
      <Sidebar>
        <ToolButton
          name="Ingest & Transcode"
          selected={tool === TOOLS.INGEST_TRANSCODE}
          onClick={() => setTool(TOOLS.INGEST_TRANSCODE)}
        />
        <ToolButton
          name="Link & Annotate"
          selected={tool === TOOLS.LINK_ANNOTATE}
          onClick={() => setTool(TOOLS.LINK_ANNOTATE)}
        />
      </Sidebar>

      {/* Contents of Tool View */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 2,
        }}
      >
        {tool === TOOLS.LINK_ANNOTATE && (
          <>
            <DescriptionBox>
              Link segments of videos with whale sightings, add visual annotations, and export
              native resolution still frames.
            </DescriptionBox>
            <ChooseFolderBrowser />
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => setRoute(ROUTES.LINK_AND_ANNOTATE)}
              sx={{ flexShrink: 0, alignSelf: 'flex-end' }}
              disabled={selectedFolderId == null}
            >
              Choose Folder
            </StyledButton>
          </>
        )}

        {tool === TOOLS.INGEST_TRANSCODE && (
          <>
            <DescriptionBox>
              Import new images and videos to internal folders, internal databases and apply
              specific compression settings.
            </DescriptionBox>
            <ChooseIngestInputs />
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => setRoute(ROUTES.INGEST)}
              sx={{ flexShrink: 0, alignSelf: 'flex-end' }}
              // disabled={selectedFolderId == null}
            >
              Parse {jobMode[0].toUpperCase() + jobMode.slice(1)}s
            </StyledButton>
          </>
        )}
      </Box>
    </Box>
  )
}

export default ToolsContainer
