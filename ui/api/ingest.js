import { baseURL } from './config'
import { getJSON, postJSONWithResponse, deleteThis } from './fetchers'

const ingestURL = `${baseURL}/ingest`

// Job Information - One
const getJob = (jobId) => getJSON(`${ingestURL}/job/${jobId}`)
const jobStatus = (jobId) => getJSON(`${ingestURL}/job_status/${jobId}`)
const deleteJob = (jobId) => deleteThis(`${ingestURL}/job/${jobId}`)
const taskStatusesForJob = async (jobId) => {
  const tasksObj = await getJSON(`${ingestURL}/job/${jobId}/tasks`)
  const tasksList = Object.entries(tasksObj).map(([taskId, task]) => ({ ...task, id: taskId }))
  return tasksList
}

// Job Information - Many
const getIncompleteJobs = () => getJSON(`${ingestURL}/job?completed=false`)
const getCompleteJobs = (page) => getJSON(`${ingestURL}/job?page=${page}&page_size=10`)

// Metadata Methods
const countFiles = (sourceFolder) =>
  getJSON(`${ingestURL}/count_files/${encodeURIComponent(sourceFolder)}`)

const parse = async (mode, sourceFolder) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/parse_${mode}s`, {
    source_dir: sourceFolder,
  })
  return data?.job_id
}
const getJobResultData = (jobId) => getJSON(`${ingestURL}/job_data/${jobId}`)

const validatePathLengths = async (mode, sourceFolder, filePaths) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/validate_path_lengths/${mode}`, {
    source_dir: sourceFolder,
    file_path_list: filePaths,
  })
  return data
}

const validateNonExistence = async (mode, sourceFolder, filePaths) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/validate_non_existence/${mode}`, {
    source_dir: sourceFolder,
    file_path_list: filePaths,
  })
  return data
}

// Sample Image Methods
const createSampleImages = async (small, medium, large) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/sample`, {
    small_image_file_path: small || undefined,
    medium_image_file_path: medium || undefined,
    large_image_file_path: large || undefined,
  })
  return data?.job_id
}
const getJobSampleData = (jobId) => getJSON(`${ingestURL}/job/${jobId}/sample_file_data`)
const deleteSampleImages = (jobId) => deleteThis(`${ingestURL}/sample/${jobId}`)

// Job Execution Methods
const transcode = async (
  sourceFolder,
  settingsList,
  mediaType,
  localOutputFolder,
  observerCode
) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/transcode`, {
    media_type: mediaType,
    source_dir: sourceFolder,
    local_export_path: localOutputFolder,
    transcode_list: settingsList,
    observer_code: observerCode,
  })
  return data?.job_id
}

const pruneOldTasks = () => deleteThis(`${ingestURL}/delete_old_tasks`)

export default {
  getJob,
  jobStatus,
  taskStatusesForJob,
  deleteJob,
  getIncompleteJobs,
  getCompleteJobs,
  countFiles,
  parse,
  getJobResultData,
  validatePathLengths,
  validateNonExistence,
  getJobSampleData,
  createSampleImages,
  deleteSampleImages,
  transcode,
  pruneOldTasks,
}
