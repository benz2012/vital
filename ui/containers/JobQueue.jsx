import { useEffect, useRef, useState, useMemo } from 'react'
import { TransitionGroup } from 'react-transition-group'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { Grid4x4 } from '@mui/icons-material'

import useStore from '../store'
import useQueueStore, { canStart } from '../store/queue'
import ingestAPI from '../api/ingest'
import queueAPI from '../api/queue'
import { jobNameFromData, scheduleTimeString } from '../utilities/strings'
import { TITLEBAR_HEIGHT } from '../constants/dimensions'
import FILE_TYPES from '../constants/fileTypes'

import JobQueueItem from '../components/JobQueueItem'
import SchedulePad from '../components/SchedulePad'
import TinyTextButton from '../components/TinyTextButton'
import TaskDetailsPad from '../components/TaskDetailsPad'
import JobReportPad from '../components/JobReportPad'
import FlowSheetPad from '../components/FlowSheetPad'

const JobQueue = () => {
  const jobQueueOpen = useStore((state) => state.jobQueueOpen)
  const setJobQueueOpen = useStore((state) => state.setJobQueueOpen)
  const closeDialog = () => setJobQueueOpen(false)

  const incompleteJobs = useQueueStore((state) => state.incompleteJobs)
  const completeJobs = useQueueStore((state) => state.completeJobs)
  const fetchJobsData = useQueueStore((state) => state.fetchJobsData)
  const loadMoreCompletedJobs = useQueueStore((state) => state.loadMoreCompletedJobs)
  useEffect(() => {
    fetchJobsData()
  }, [])

  const deleteJob = async (jobId) => {
    await ingestAPI.deleteJob(jobId)
    await fetchJobsData()
  }

  const queueRunning = useQueueStore((state) => state.isRunning)
  const startRunningChecker = useQueueStore((state) => state.startRunningChecker)
  const startQueue = () => {
    queueAPI.executeNow()
    startRunningChecker()
  }

  const queueDialogRef = useRef(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const toggleSchedule = () => {
    setTaskDetailsJobId(null)
    setJobReportId(null)
    setFlowSheetOpen(false)
    setScheduleOpen(!scheduleOpen)
  }

  const fetchSchedule = useQueueStore((state) => state.fetchSchedule)
  const commitSchedule = async (timeString) => {
    const todayDate = new Date().toISOString().split('T')[0]
    const [hh, mm, period] = timeString.split(':')
    const hh24 = period === 'PM' ? parseInt(hh) + 12 : hh
    const timestamp = new Date(`${todayDate}T${hh24}:${mm}:00`)
    await queueAPI.setSchedule(timestamp)
    await fetchSchedule()
    setScheduleOpen(false)
  }
  const deleteSchedule = async () => {
    await queueAPI.deleteSchedule()
    await fetchSchedule()
  }

  const schedule = useQueueStore((state) => state.schedule)
  const scheduleTime = scheduleTimeString(schedule)

  const canQueueStart = useQueueStore(canStart)
  const canLoadMore = completeJobs.length !== 0 && completeJobs.length % 10 === 0

  const setConfirmationDialogOpen = useStore((state) => state.setConfirmationDialogOpen)
  const setConfirmationDialogProps = useStore((state) => state.setConfirmationDialogProps)
  const cleanUpJobs = () => {
    setConfirmationDialogProps({
      title: 'Clean Up Jobs',
      body: `This action will:
      - Archive all jobs for which a Report CSV has been exported.
      - Archive all jobs older than 10 days.

      Are you sure you want to do this?`,
      onConfirm: async () => {
        await ingestAPI.cleanUpJobs()
        await fetchJobsData()
      },
    })
    setConfirmationDialogOpen(true)
  }

  const triggerFlowSheetExport = async (forObserver) => {
    const filePath = await window.api.selectFile(FILE_TYPES.FOLDER)
    if (!filePath) return
    const result = await ingestAPI.exportFlowSheet(filePath, forObserver)
    return result
  }

  /* Task Details Data Logic */
  const [taskDetailsJobId, setTaskDetailsJobId] = useState(null)
  const taskDetails = useMemo(() => {
    const foundJob = incompleteJobs.find((job) => job.id === taskDetailsJobId)
    if (!foundJob) return null
    return {
      name: jobNameFromData(foundJob.data, foundJob.tasks.length),
      tasks: foundJob?.tasks,
    }
  }, [taskDetailsJobId, JSON.stringify(incompleteJobs)])
  const taskDetailsOpen = taskDetails != null
  const toggleTaskDetails = (jobId) => {
    setScheduleOpen(false)
    setJobReportId(null)
    setFlowSheetOpen(false)
    setTaskDetailsJobId((prev) => (prev === jobId ? null : jobId))
  }

  /* Job Report Data Logic */
  const [jobReportId, setJobReportId] = useState(null)
  const jobReport = useMemo(() => {
    const foundJob = completeJobs.find((job) => job.id === jobReportId)
    if (!foundJob) return null
    return {
      id: foundJob.id,
      name: jobNameFromData(foundJob.data, foundJob.tasks.length),
      data: JSON.parse(foundJob?.report_data || '{}'),
      completedAt: foundJob?.completed_date,
    }
  }, [jobReportId, JSON.stringify(completeJobs)])
  const jobReportOpen = jobReport != null
  const toggleJobReport = (jobId) => {
    setScheduleOpen(false)
    setTaskDetailsJobId(null)
    setFlowSheetOpen(false)
    setJobReportId((prev) => (prev === jobId ? null : jobId))
  }
  const triggerReportExport = async () => {
    const filePath = await window.api.selectFile(FILE_TYPES.FOLDER)
    if (!filePath) return
    const result = await ingestAPI.exportReportCSV(jobReportId, filePath)
    return result
  }
  const reloadOneCompletedJob = useQueueStore((state) => state.reloadOneCompletedJob)

  /* Flow Sheet Export Logic */
  const [flowSheetOpen, setFlowSheetOpen] = useState(false)
  const toggleFlowSheet = () => {
    setScheduleOpen(false)
    setTaskDetailsJobId(null)
    setJobReportId(null)
    setFlowSheetOpen(!flowSheetOpen)
  }

  const completedObserverCodes = [
    ...new Set(
      completeJobs.map((job) => {
        try {
          return JSON.parse(job.data).observer_code
        } catch (e) {
          console.error(`Error parsing observer_code from job data: ${e}`)
          return null
        }
      })
    ),
  ].toSorted()

  /* General effect, keep last */
  useEffect(() => {
    setScheduleOpen(false)
    setTaskDetailsJobId(null)
    setJobReportId(null)
    setFlowSheetOpen(false)
  }, [jobQueueOpen])

  const slideQueueOver = scheduleOpen || taskDetailsOpen || jobReportOpen || flowSheetOpen

  /** Rendering Section **/

  let topActionSection = null
  if (queueRunning) {
    topActionSection = <Box sx={{ color: 'secondary.main' }}>Running</Box>
  } else if (schedule != null) {
    topActionSection = (
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          Scheduled Run
        </Box>
        <Box component="span" sx={{ fontWeight: 500 }}>
          Today @ {scheduleTime}
        </Box>
        <Box sx={{ marginLeft: 0 }}>
          <TinyTextButton onClick={deleteSchedule}>clear</TinyTextButton>
        </Box>
      </Box>
    )
  } else {
    topActionSection = (
      <>
        <Button color="tertiary" disabled={!canQueueStart || scheduleOpen} onClick={startQueue}>
          Start Now <PlayArrowIcon sx={{ fontSize: '20px' }} />
        </Button>

        <Button
          color="secondary"
          disabled={!canQueueStart}
          onClick={toggleSchedule}
          variant={scheduleOpen ? 'contained' : 'text'}
          sx={{ color: scheduleOpen ? 'white' : undefined }}
          disableElevation
        >
          Schedule <ScheduleIcon sx={{ marginLeft: 0.5, fontSize: '20px' }} />
        </Button>
        <SchedulePad
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          parent={queueDialogRef.current}
          onCommit={commitSchedule}
        />
      </>
    )
  }

  return (
    <Dialog
      open={jobQueueOpen}
      onClose={closeDialog}
      fullWidth
      maxWidth="sm"
      disablePortal
      sx={{
        position: 'aboslute',
        top: `${TITLEBAR_HEIGHT}px`,
      }}
      slotProps={{
        backdrop: {
          sx: { top: `${TITLEBAR_HEIGHT}px` },
        },
      }}
      PaperProps={{
        ref: queueDialogRef,
        sx: {
          minHeight: '60vh',
          right: slideQueueOver ? '250px' : '0px',
          transition: 'right 0.3s ease',
          position: 'relative',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginRight: 6 }}>
        <DialogTitle>Job Queue</DialogTitle>
        <Box sx={{ flexGrow: 1 }} />
        {topActionSection}
      </Box>
      <IconButton
        onClick={closeDialog}
        size="small"
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1),
        })}
      >
        <CloseIcon sx={{ fontSize: '30px' }} />
      </IconButton>

      <DialogContent sx={{ paddingTop: 0 }}>
        <Typography variant="h6">Incomplete Jobs</Typography>
        {incompleteJobs.length === 0 && <Box sx={{ fontStyle: 'italic' }}>None</Box>}
        {incompleteJobs.map((job, index) => {
          const { id, status, data, error_message } = job
          const jobCompletionAbsolute = job.tasks.reduce(
            (acc, task) => acc + task.size * (task.progress / 100),
            0
          )
          const jobCompletionPercent = (jobCompletionAbsolute / job.size) * 100
          return (
            <JobQueueItem
              key={id}
              id={id}
              status={status}
              name={jobNameFromData(data, job.tasks.length)}
              info={{
                progress: jobCompletionPercent,
              }}
              actions={{
                deleteJob,
                toggleTaskDetails,
              }}
              queueRunning={queueRunning}
              firstItem={index === 0}
              lastItem={index === incompleteJobs.length - 1}
              errorMessage={error_message}
            />
          )
        })}

        <Typography variant="h6" mt={2} sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Complete Jobs
          <Box>
            <Button
              color="success"
              sx={{ textTransform: 'none' }}
              endIcon={<Grid4x4 />}
              onClick={toggleFlowSheet}
              disabled={completeJobs.length === 0}
            >
              Export PA Flow CSV
            </Button>
            <Button
              color="warning"
              sx={{ textTransform: 'none' }}
              endIcon={<DeleteSweepIcon />}
              onClick={cleanUpJobs}
              disabled={completeJobs.length === 0}
            >
              Clean Up Jobs
            </Button>
          </Box>
        </Typography>
        {completeJobs.length === 0 && <Box sx={{ fontStyle: 'italic' }}>None</Box>}

        <TransitionGroup>
          {completeJobs.map((job, index) => {
            const { id, status, completed_date, data, report_data } = job
            const report = JSON.parse(report_data || '{}')
            const exportedOnce = Boolean(report?.output_file)
            return (
              <Collapse key={id}>
                <JobQueueItem
                  id={id}
                  status={status}
                  name={jobNameFromData(data, job.tasks.length)}
                  info={{
                    completedDate: completed_date,
                    exportedOnce,
                  }}
                  actions={{
                    toggleJobReport,
                  }}
                  queueRunning={queueRunning}
                  firstItem={index === 0}
                  lastItem={index === completeJobs.length - 1}
                />
              </Collapse>
            )
          })}
        </TransitionGroup>

        <Box sx={{ marginTop: 2 }} />
        <Button onClick={loadMoreCompletedJobs} disabled={!canLoadMore}>
          Load More
        </Button>

        <TaskDetailsPad
          open={taskDetailsOpen}
          onClose={() => setTaskDetailsJobId(null)}
          parent={queueDialogRef.current}
          jobName={taskDetails?.name || ''}
          tasks={taskDetails?.tasks || []}
        />

        <JobReportPad
          open={jobReportOpen}
          onClose={() => setJobReportId(null)}
          parent={queueDialogRef.current}
          jobId={jobReport?.id || null}
          jobName={jobReport?.name || ''}
          completedAt={jobReport?.completedAt || null}
          data={jobReport?.data || {}}
          onExport={triggerReportExport}
          reloadJob={reloadOneCompletedJob}
        />

        <FlowSheetPad
          open={flowSheetOpen}
          onClose={() => setFlowSheetOpen(false)}
          parent={queueDialogRef.current}
          observerCodes={completedObserverCodes}
          onExport={triggerFlowSheetExport}
        />
      </DialogContent>
    </Dialog>
  )
}

export default JobQueue
