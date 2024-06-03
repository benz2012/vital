import { baseURL } from './config'
import { postJSON } from './fetchers'

const create = (videoId, fileName, frameNumber) =>
  postJSON(`${baseURL}/still_exports`, {
    CatalogVideoId: videoId,
    FileName: fileName,
    FrameNumber: frameNumber,
  })

export default {
  create,
}
