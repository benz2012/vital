// We should update this module to be OS dependent if we ever want to support more than Windows

export const splitPath = (path) => {
  return path.split('\\')
}

export const leafPath = (path) => {
  return path.split('\\').pop()
}

export const joinPath = (parts) => {
  return parts.join('\\')
}

export const folderSlash = () => '\\'

export const nameNoExt = (path) => {
  return path.split('.').slice(0, -1).join('.')
}

export const dateObserverFolderData = (folderName) => {
  const parts = folderName.split('-')
  const dateParts = parts.slice(0, 3)
  const observerParts = parts.slice(3)

  const dateString = dateParts.join('-')
  const observerCode = observerParts.join('-')
  return { dateString, observerCode }
}

// Ensure this method matches the method on the backend (safe_observer_code)
export const safeObserverCode = (observerCode) => {
  return observerCode
    .replace('/', '-')
    .replace('\\', '-')
    .replace(':', '-')
    .replace('*', '')
    .replace('?', '')
    .replace('"', '-')
    .replace('>', '-')
    .replace('<', '-')
    .replace('|', '-')
}
