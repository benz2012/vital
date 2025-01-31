import { useShallow } from 'zustand/react/shallow'
import Box from '@mui/material/Box'

import useStore from '../store'
import useSettingsStore from '../store/settings'
import useJobStore from '../store/job'
import useQueueStore from '../store/queue'
import { isSaveable } from '../store/linkages'
import ROUTES from '../constants/routes'
import { TITLEBAR_HEIGHT, SIDEBAR_WIDTH } from '../constants/dimensions'
import { TITLES } from '../constants/routes'
import NavbarButton from '../components/NavbarButton'

const Navbar = ({ width }) => {
  const [resetStore, route, setRoute] = useStore(
    useShallow((state) => [state.resetStore, state.route, state.setRoute])
  )
  const [settingsInitialized, settingsOpen, setSettingsOpen] = useSettingsStore(
    useShallow((state) => [state.initialized, state.open, state.setOpen])
  )
  const resetJobStore = useJobStore((state) => state.reset)

  const title = TITLES[route]

  const savable = useStore(isSaveable)
  const setConfirmationDialogOpen = useStore((state) => state.setConfirmationDialogOpen)
  const setConfirmationDialogProps = useStore((state) => state.setConfirmationDialogProps)

  const numJobs = useQueueStore((state) => state.incompleteJobs.length)
  const jobQueueOpen = useStore((state) => state.jobQueueOpen)
  const setJobQueueOpen = useStore((state) => state.setJobQueueOpen)
  const multiDayImportOpen = useStore((state) => state.multiDayImportOpen)

  const handleToolsClick = () => {
    const action = () => {
      setSettingsOpen(false)
      setJobQueueOpen(false)
      if (route === ROUTES.TOOLS) return
      setRoute(ROUTES.TOOLS)
      resetStore()
      resetJobStore()
    }

    if (!savable) {
      action()
    } else {
      setConfirmationDialogProps({
        title: 'Unsaved Changes',
        body: 'You have unsaved changes. Are you sure you want to navigate back home?',
        onConfirm: action,
      })
      setConfirmationDialogOpen(true)
    }
  }

  const tabSelected = (() => {
    if (settingsOpen) return 1
    if (jobQueueOpen) return 2
    if (route === ROUTES.TOOLS) return 0
    return null
  })()

  if (width === 0) return null

  return (
    <Box
      sx={{
        width: `${width}px`,
        height: `${TITLEBAR_HEIGHT}px`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <NavbarButton
        selected={tabSelected === 0}
        disabled={!settingsInitialized || multiDayImportOpen}
        onClick={handleToolsClick}
      >
        Tools
      </NavbarButton>
      <NavbarButton
        selected={tabSelected === 1}
        disabled={multiDayImportOpen}
        onClick={() => {
          setJobQueueOpen(false)
          setSettingsOpen(true)
        }}
      >
        Settings
      </NavbarButton>
      <NavbarButton
        selected={tabSelected === 2}
        disabled={!settingsInitialized || multiDayImportOpen}
        onClick={() => {
          setSettingsOpen(false)
          setJobQueueOpen(true)
        }}
      >
        Job Queue ({numJobs})
      </NavbarButton>
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          WebkitAppRegion: 'drag', // tells the OS we can drag the window here
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 500,
          backgroundColor: 'primary.dark',
        }}
      >
        {title}
      </Box>

      {/* Extra box behind navbar to hide window resizing artifacts */}
      <Box
        sx={{
          position: 'fixed',
          width: `${SIDEBAR_WIDTH}px`,
          height: `${TITLEBAR_HEIGHT}px`,
          right: 0,
          backgroundColor: 'primary.dark',
          zIndex: -1,
        }}
      />
    </Box>
  )
}

export default Navbar
