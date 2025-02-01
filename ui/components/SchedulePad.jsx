import { useEffect, useState } from 'react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import JobQueueSidePad from './JobQueueSidePad'

const SchedulePad = ({ open, onClose, parent, onCommit }) => {
  const [hour, setHour] = useState('10')
  const [minute, setMinute] = useState('00')
  const [period, setPerod] = useState('PM')

  const [timeError, setTimeError] = useState('')
  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0]
    const hh24 = period === 'PM' ? parseInt(hour) + 12 : hour
    const timestamp = new Date(`${todayDate}T${hh24}:${minute}:00`)
    if (timestamp < new Date()) {
      setTimeError('Time must be in the future')
    } else {
      setTimeError('')
    }
  }, [hour, minute, period])

  const handleCommit = () => {
    onCommit(`${hour}:${minute}:${period}`)
  }

  const [closePadInc, setClosePadInc] = useState(0)
  const handleCloseWithinPad = () => {
    setClosePadInc((prev) => prev + 1)
  }

  return (
    <JobQueueSidePad
      open={open}
      onClose={onClose}
      parent={parent}
      width={250}
      externalCloseIncrementor={closePadInc}
    >
      Today at
      <Box sx={{ marginTop: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {/* Hour */}
        <Select
          value={hour}
          onChange={(event) => setHour(event.target.value)}
          variant="standard"
          sx={{ width: '48px' }}
        >
          <MenuItem value={'01'}>01</MenuItem>
          <MenuItem value={'02'}>02</MenuItem>
          <MenuItem value={'03'}>03</MenuItem>
          <MenuItem value={'04'}>04</MenuItem>
          <MenuItem value={'05'}>05</MenuItem>
          <MenuItem value={'06'}>06</MenuItem>
          <MenuItem value={'07'}>07</MenuItem>
          <MenuItem value={'08'}>08</MenuItem>
          <MenuItem value={'09'}>09</MenuItem>
          <MenuItem value={'10'}>10</MenuItem>
          <MenuItem value={'11'}>11</MenuItem>
          <MenuItem value={'12'}>12</MenuItem>
        </Select>

        {':'}

        {/* Minute */}
        <Select
          value={minute}
          onChange={(event) => setMinute(event.target.value)}
          variant="standard"
          sx={{ width: '48px' }}
        >
          <MenuItem value={'00'}>00</MenuItem>
          <MenuItem value={'15'}>15</MenuItem>
          <MenuItem value={'30'}>30</MenuItem>
          <MenuItem value={'45'}>45</MenuItem>
        </Select>

        {/* Day Period */}
        <Select
          value={period}
          onChange={(event) => setPerod(event.target.value)}
          variant="standard"
          sx={{ width: '64px' }}
        >
          <MenuItem value={'AM'}>AM</MenuItem>
          <MenuItem value={'PM'}>PM</MenuItem>
        </Select>
      </Box>
      {timeError && <Box sx={{ color: 'error.main' }}>{timeError}</Box>}
      <Box
        sx={{
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ color: 'text.secondary' }}>
          <Button variant="outlined" color="inherit" onClick={handleCloseWithinPad}>
            Cancel
          </Button>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          disableElevation
          sx={{ color: 'white' }}
          onClick={handleCommit}
          disabled={!!timeError}
        >
          Set
        </Button>
      </Box>
    </JobQueueSidePad>
  )
}

export default SchedulePad
