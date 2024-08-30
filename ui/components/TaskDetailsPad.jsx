import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

import { titleCase } from '../utilities/strings'
import STATUSES from '../constants/statuses'

const textColorForStatus = (status) => {
  if (status === STATUSES.COMPLETED) {
    return 'success.main'
  }
  if (status === STATUSES.QUEUED) {
    return 'text.disabled'
  }
  if (status === STATUSES.ERROR) {
    return 'error.main'
  }
  return 'text.primary'
}

const TaskDetailsPad = ({ open, onClose, parent, jobName, tasks }) => {
  const [top, setTop] = useState(0)
  const [delayedSlide, setDelayedSlide] = useState(false)

  useEffect(() => {
    if (open) {
      const parentDialogBox = parent.getBoundingClientRect()
      setTop(parentDialogBox.top)
      setTimeout(() => setDelayedSlide(true), 0)
    } else {
      setDelayedSlide(false)
    }
  }, [open])

  const handleClose = () => {
    setDelayedSlide(false)
    setTimeout(onClose, 0)
  }

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => console.log(reason)}
      disablePortal
      hideBackdrop
      PaperProps={{
        sx: {
          position: 'fixed',
          padding: 2,
          width: '300px',
          marginTop: 0,
          top: `${top}px`,
          left: delayedSlide ? 'calc(50% + 48px)' : 'calc(50% + 48px + 300px)',
          transition: 'left 0.3s ease',
        },
      }}
      slotProps={{
        root: { sx: { width: 0 } },
      }}
    >
      <IconButton
        onClick={handleClose}
        size="small"
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1.7),
        })}
      >
        <CloseIcon sx={{ fontSize: '24px' }} />
      </IconButton>

      <Box
        sx={(theme) => ({
          width: '90%',
          marginBottom: 1,
          fontFamily: theme.typography.monoFamily,
        })}
      >
        {jobName.split(' — ')[0]}
        <br />
        {jobName.split(' — ')[1]}
      </Box>

      {tasks.map((task, index) => (
        <Box
          key={task.id}
          sx={(theme) => ({ fontSize: '12px', fontFamily: theme.typography.monoFamily })}
        >
          <Box sx={{ display: 'flex' }}>
            <Box sx={{ width: '80px' }}>Task #{index}</Box>
            <Box sx={{ color: textColorForStatus(task.status) }}>{titleCase(task.status)}</Box>
            <Box sx={{ flexGrow: 1 }} />
            <Box>{task.progress}%</Box>
          </Box>
          <Box sx={{ color: 'error.main' }}>{task.error_message}</Box>
        </Box>
      ))}
    </Dialog>
  )
}

export default TaskDetailsPad
