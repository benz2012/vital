import { useEffect, useRef, useState } from 'react'
import { VariableSizeList as VirtualList } from 'react-window'
import Box from '@mui/material/Box'

import { titleCase } from '../utilities/strings'
import STATUSES, { PROGRESS_MESSAGES } from '../constants/statuses'
import JobQueueSidePad from './JobQueueSidePad'

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

const textColorForProgressMessage = (tier, currentMessage) => {
  if (tier === 0) {
    if (currentMessage !== PROGRESS_MESSAGES.TRANSCODING) {
      return 'success.main'
    }
  }
  if (tier === 1) {
    if (currentMessage === PROGRESS_MESSAGES.TRANSCODING) {
      return 'text.disabled'
    } else if (currentMessage === PROGRESS_MESSAGES.DATA_ENTRY) {
      return 'success.main'
    }
  }
  if (tier === 2) {
    if (currentMessage !== PROGRESS_MESSAGES.DATA_ENTRY) {
      return 'text.disabled'
    }
  }
  return 'text.primary'
}

const RowItem = ({ data, index, style }) => {
  const { items } = data
  const task = items[index]

  return (
    <Box
      style={style}
      sx={(theme) => ({
        fontSize: '12px',
        fontFamily: theme.typography.monoFamily,
        paddingRight: 1,
      })}
    >
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: '80px' }}>Task #{index + 1}</Box>
        <Box sx={{ color: textColorForStatus(task.status) }}>{titleCase(task.status)}</Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box>{task.progress}%</Box>
      </Box>
      {[STATUSES.INCOMPLETE, STATUSES.ERROR].includes(task.status) && (
        <Box sx={{ marginLeft: 1 }}>
          <Box sx={{ color: textColorForProgressMessage(0, task.progress_message) }}>
            Transcoding
          </Box>
          <Box sx={{ color: textColorForProgressMessage(1, task.progress_message) }}>Copying</Box>
          <Box sx={{ color: textColorForProgressMessage(2, task.progress_message) }}>
            Data Entry
          </Box>
        </Box>
      )}
      <Box sx={{ color: 'error.main' }}>{task.error_message}</Box>
    </Box>
  )
}

const TaskDetailsPad = ({ open, onClose, parent, jobName, tasks }) => {
  const [maxHeight, setMaxHeight] = useState(0)

  const virtualListRef = useRef(null)
  const taskStatuses = tasks.map((task) => task.status)
  useEffect(() => {
    virtualListRef.current?.resetAfterIndex(0)
  }, [JSON.stringify(taskStatuses)])

  return (
    <JobQueueSidePad
      open={open}
      onClose={onClose}
      parent={parent}
      width={300}
      tellMaxHeight={setMaxHeight}
      displayCloseButton
    >
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

      <VirtualList
        ref={virtualListRef}
        itemData={{
          items: tasks,
        }}
        itemCount={tasks.length}
        overscanCount={10}
        width="100%"
        height={maxHeight}
        itemSize={(index) => {
          const task = tasks[index]
          if (task.status === STATUSES.INCOMPLETE) {
            return 20 * 1 + 20 * 3
          }
          if (task.error_message?.length > 0) {
            return 20 * 1 + 20 * 3 + 20 * 8
          }
          return 20 * 1
        }}
      >
        {RowItem}
      </VirtualList>
    </JobQueueSidePad>
  )
}

export default TaskDetailsPad
