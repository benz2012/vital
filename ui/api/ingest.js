import { baseURL } from './config'
import { getJSON, postJSONWithResponse } from './fetchers'

const ingestURL = `${baseURL}/ingest`

const jobStatus = (jobId) => getJSON(`${ingestURL}/job_status/${jobId}`)

const countFiles = (sourceFolder) =>
  getJSON(`${ingestURL}/count_files/${encodeURIComponent(sourceFolder)}`)

const parse = async (mode, sourceFolder) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/parse_${mode}s`, {
    source_folder: encodeURIComponent(sourceFolder),
  })
  return data?.job_id
}

const getParsedMetadata = (jobId) => getJSON(`${ingestURL}/parse_videos/${jobId}`)

const getCompressionOptions = () => new Promise((resolve) => setTimeout(resolve, 500))

const transcode = async (sourceFolder) => {
  const { data } = await postJSONWithResponse(`${ingestURL}/transcode`, {
    source_dir: encodeURIComponent(sourceFolder),
    transcode_list: [],
  })
  return data?.job_id
}

export default {
  jobStatus,
  countFiles,
  parse,
  getParsedMetadata,
  getCompressionOptions,
  transcode,
}
