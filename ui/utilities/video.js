export const getFrameRateFromDashPlayer = (dashPlayer) => {
  const streamInfo = dashPlayer.getActiveStream().getStreamInfo()
  const dashMetrics = dashPlayer.getDashMetrics()
  const dashAdapter = dashPlayer.getDashAdapter()

  const periodIdx = streamInfo.index
  const repSwitch = dashMetrics.getCurrentRepresentationSwitch('video', true)
  const adaptation = dashAdapter.getAdaptationForType(periodIdx, 'video', streamInfo)
  const currentRep = adaptation.Representation_asArray.find((rep) => rep.id === repSwitch.to)

  const frameRateStr = `${currentRep.frameRate}`
  if (frameRateStr.includes('/')) {
    const [numerator, denominator] = frameRateStr.split('/')
    return parseFloat(numerator) / parseFloat(denominator)
  } else {
    return parseFloat(frameRateStr)
  }
}

export const timecodeFromFrameNumber = (frameNumber, frameRate) => {
  // Note: this function does not handle hours (aka more than 60 minutes)
  const currentMinutes = `${Math.floor(frameNumber / frameRate / 60)}`.padStart(2, '0')
  const currentSeconds = `${Math.floor(frameNumber / frameRate) % 60}`.padStart(2, '0')
  const currentFrames = `${Math.floor(frameNumber % frameRate)}`.padStart(2, '0')
  const timecode = `${currentMinutes}:${currentSeconds};${currentFrames}`
  return timecode
}