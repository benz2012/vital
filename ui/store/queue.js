import { create } from 'zustand'

import { valueSetter } from './utils'
import ingestAPI from '../api/ingest'
import queueAPI from '../api/queue'
import STATUSES from '../constants/statuses'

const initialState = {
  incompleteJobs: [],
  completeJobs: [],
  nextPage: 2,
  isRunning: false,
  schedule: null,
  latestFlowSheet: null,
}

const useQueueStore = create((set, get) => ({
  ...initialState,
  reset: () => set(initialState),

  fetchJobsData: async () => {
    const jobs = await Promise.all([
      collateJobsWithTasks(ingestAPI.getIncompleteJobs()),
      collateJobsWithTasks(ingestAPI.getCompleteJobs(1)),
    ])
    const [_incompleteJobs, _completeJobs] = jobs
    set({
      incompleteJobs: _incompleteJobs,
      completeJobs: _completeJobs,
      nextPage: initialState.nextPage,
    })
  },

  loadMoreCompletedJobs: async () => {
    const { nextPage, completeJobs } = get()
    const moreJobs = await collateJobsWithTasks(ingestAPI.getCompleteJobs(nextPage))
    const nextNextPage = moreJobs?.length === 0 ? nextPage : nextPage + 1
    set({ completeJobs: [...completeJobs, ...moreJobs], nextPage: nextNextPage })
  },

  reloadOneCompletedJob: async (jobId) => {
    const { completeJobs } = get()

    const updatedJob = await ingestAPI.getJob(jobId)
    const updatedJobsWithTasks = await collateJobsWithTasks(Promise.resolve([updatedJob]))
    const updatedJobWithTasks = updatedJobsWithTasks[0]
    const updatedJobs = completeJobs.map((job) => (job.id === jobId ? updatedJobWithTasks : job))

    set({ completeJobs: updatedJobs })
  },

  updateActiveJob: async () => {
    const { incompleteJobs } = get()
    if (incompleteJobs.length === 0) return
    const activeJob = incompleteJobs[0]
    const [newJobData, newTasks] = await Promise.all([
      ingestAPI.getJob(activeJob.id),
      ingestAPI.taskStatusesForJob(activeJob.id),
    ])

    let updatedJobs = {}
    const updatedJob = { ...activeJob, ...newJobData, tasks: newTasks }

    if (newJobData.status === STATUSES.COMPLETED) {
      // Here we watch for a new completion and move the job between lists, instead of reloading both lists from backend
      // We reduce the completeJobs set so that if it's at a multiple of 10, it will remain so, which is related to the Load More logic
      const { completeJobs } = get()
      const existingCompleteJobs =
        completeJobs.length % 10 === 0
          ? completeJobs.slice(0, completeJobs.length - 1)
          : completeJobs
      updatedJobs = {
        incompleteJobs: incompleteJobs.slice(1),
        completeJobs: [updatedJob, ...existingCompleteJobs],
      }
    } else {
      updatedJobs = { incompleteJobs: [updatedJob, ...incompleteJobs.slice(1)] }
    }

    set(updatedJobs)
  },

  startRunningChecker: (trigerredBySchedule = false) => {
    const LOOP_PERIOD_MS = 1000
    const checkerLoop = async () => {
      const { isRunning: prevIsRunning } = get()
      const newIsRunning = await queueAPI.isRunning()

      if (prevIsRunning === false && newIsRunning === true) {
        // If we just started running, we can update the related UI immediately
        set({ isRunning: newIsRunning })
      }

      if (newIsRunning === true || prevIsRunning === true) {
        // If we are running, fetch updated info about the running job on the same interval
        // We check the prev value as well in case we just stopped, we want one more data update
        await get().updateActiveJob()
      }

      // Break the loop if we move from Running to Not Running
      if (prevIsRunning === true && newIsRunning === false) {
        // Get the latest schedule from the backend, which should be null, now that it's finished
        // and only set the latest isRunning after that check has completed, so that we can't have
        // a state of isRunning=false with a schedule still present
        await get().fetchSchedule()
        set({ isRunning: newIsRunning })
        return
      }

      // Break the loop if, after triggered by a new schedule, that schedule no longer exists,
      // and the queue is not running.
      if (trigerredBySchedule) {
        const latestSchedule = await queueAPI.getSchedule()
        if ((get().schedule == null || latestSchedule == null) && newIsRunning === false) {
          set({ schedule: latestSchedule })
          return
        }
      }

      set({ isRunning: newIsRunning })
      setTimeout(checkerLoop, LOOP_PERIOD_MS)
    }
    checkerLoop() // officially start the loop
  },

  fetchSchedule: async () => {
    const schedule = await queueAPI.getSchedule()

    // If the schedule is in the past, we should clear it
    // Even though the schedule is stored on the backend, we perform this operation on the UI
    // so that we have control over updating the display of that schedule
    const now = new Date()
    const sixty_seconds_ago = now.setSeconds(now.getSeconds() - 60)
    if (new Date(schedule) < sixty_seconds_ago) {
      queueAPI.deleteSchedule()
      set({ schedule: null })
    }

    set({ schedule })
    if (schedule != null) {
      get().startRunningChecker(true)
    }
  },

  setLatestFlowSheet: valueSetter(set, 'latestFlowSheet'),
}))

const collateJobsWithTasks = async (jobsPromise) => {
  const jobs = await jobsPromise
  const jobTasksPromises = jobs.map((job) => ingestAPI.taskStatusesForJob(job.id))
  const jobTasks = await Promise.all(jobTasksPromises)
  jobTasks.forEach((tasks, index) => {
    jobs[index].tasks = tasks
    jobs[index].size = tasks.reduce((acc, task) => acc + task.size, 0)
  })
  return jobs
}

const canStart = (state) => {
  const { incompleteJobs } = state
  if (incompleteJobs.length === 0) return false
  return true
}

const isQueueStagnant = (state) => {
  const { incompleteJobs, isRunning, schedule } = state
  if (incompleteJobs.length > 0 && isRunning === false && schedule == null) {
    return true
  }
  return false
}

export { canStart, isQueueStagnant }
export default useQueueStore
