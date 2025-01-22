import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

const JobQueueSidePad = ({
  open,
  onClose,
  parent,
  width,
  sx,
  displayCloseButton,
  tellMaxHeight,
  externalCloseIncrementor,
  children,
}) => {
  const [top, setTop] = useState(0)
  const [maxHeight, setMaxHeight] = useState(0)
  const [delayedSlide, setDelayedSlide] = useState(false)

  useEffect(() => {
    if (open) {
      const parentDialogBox = parent.getBoundingClientRect()
      setTop(parentDialogBox.top)
      setMaxHeight(parentDialogBox.height)
      if (tellMaxHeight) {
        tellMaxHeight(parentDialogBox.height)
      }
      setTimeout(() => setDelayedSlide(true), 0)
    } else {
      setDelayedSlide(false)
    }
  }, [open])

  const handleClose = () => {
    setDelayedSlide(false)
    setTimeout(onClose, 0)
  }
  useEffect(() => {
    if (!externalCloseIncrementor) return // defined, or greater than 0
    handleClose()
  }, [externalCloseIncrementor])

  return (
    <Dialog
      open={open}
      disablePortal
      hideBackdrop
      PaperProps={{
        sx: {
          position: 'fixed',
          padding: 2,
          width: `${width}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          marginTop: 0,
          top: `${top}px`,
          left: delayedSlide ? 'calc(50% + 48px)' : `calc(50% + 48px + ${width}px)`,
          transition: 'left 0.3s ease',
          ...sx,
        },
      }}
      slotProps={{
        root: { sx: { width: 0 } },
      }}
    >
      {displayCloseButton === true && (
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
      )}

      {children}
    </Dialog>
  )
}

export default JobQueueSidePad
