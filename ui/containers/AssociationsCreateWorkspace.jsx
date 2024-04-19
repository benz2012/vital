import Box from '@mui/material/Box'

import VideoPlayer from '../components/VideoPlayer'
import VideoTimeline from '../components/VideoTimeline'
import AssociationsDetailsBox from '../components/AssociationDetailsBox'
import StyledButton from '../components/StyledButton'
import { association as dummyAssociation } from '../constants/dummyData'

const TIMELINE_HEIGHT = 48
const DETAILS_HEIGHT = 245

const AssociationsCreateWorkspace = ({ handleSave, handleSkip }) => {
  const setStart = () => {}
  const setEnd = () => {}
  const openSightingDialog = () => {}
  const deleteAnnotation = () => {}

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <VideoPlayer siblingHeights={[TIMELINE_HEIGHT, DETAILS_HEIGHT]} />
      </Box>

      <Box sx={{ flex: `0 0 ${TIMELINE_HEIGHT}px` }}>
        <VideoTimeline />
      </Box>

      <Box sx={{ flex: `0 0 ${DETAILS_HEIGHT}px`, display: 'flex' }}>
        <Box sx={{ flexGrow: 1, textWrap: 'nowrap', overflow: 'hidden' }}>
          <AssociationsDetailsBox
            regionStart={dummyAssociation.regionStart}
            regionEnd={dummyAssociation.regionEnd}
            setStart={setStart}
            setEnd={setEnd}
            sightingName={dummyAssociation.sightingName}
            annotations={dummyAssociation.annotations}
            openSightingDialog={openSightingDialog}
            deleteAnnotation={deleteAnnotation}
          />
        </Box>
        <Box
          sx={{
            width: '200px',
            margin: 1,
            marginLeft: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <StyledButton disabled>Annotation Tools</StyledButton>
          <StyledButton disabled>Export Still Frame</StyledButton>
          <StyledButton onClick={handleSave}>Save Association</StyledButton>
          <StyledButton onClick={handleSkip}>Skip Video</StyledButton>
        </Box>
      </Box>
    </Box>
  )
}

export default AssociationsCreateWorkspace
