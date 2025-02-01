import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import AutorenewIcon from '@mui/icons-material/Autorenew'

import useJobStore from '../store/job'
import { leafPath, dateObserverFolderData, safeObserverCode } from '../utilities/paths'
import { bytesToSize } from '../utilities/strings'
import { calculateCompressedSizes } from '../utilities/numbers'
import STATUSES from '../constants/statuses'
import { COMPRESSION_OPTIONS } from '../constants/fileTypes'

import Sidebar from '../components/Sidebar'
import SidebarHeader from '../components/SidebarHeader'
import TinyTextButton from '../components/TinyTextButton'
import FilesizeSwarmHistogram from '../components/FilesizeSwarmHistogram'
import PhaseTriggerSection from '../components/PhaseTriggerSection'

const CompressionSidebar = ({
  status,
  darkNumStatus,
  darkNum,
  darkNumProgress,
  darkSampleStatus,
  darkSampleProgress,
  onDarkSampleOpen,
  darkNumSelected,
  canRecreateBuckets,
  recreateBuckets,
  actionName,
  canTrigger,
  onTriggerAction,
}) => {
  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const observerCode = useJobStore((state) => state.observerCode)
  const compressionBuckets = useJobStore((state) => state.compressionBuckets)
  const multiDayImport = useJobStore((state) => state.multiDayImport)
  const setMultiDayImport = useJobStore((state) => state.setMultiDayImport)

  const allOriginalSizes = []
  const allCompressedSizes = []
  Object.values(compressionBuckets).forEach((bucket) => {
    const { selection, fileSizes, resolutions } = bucket
    allOriginalSizes.push(...fileSizes)
    const compressedSizes = calculateCompressedSizes(selection, fileSizes, resolutions)
    allCompressedSizes.push(...compressedSizes)
  })

  const totalSavings = allOriginalSizes.reduce((acc, size, index) => {
    return acc + size - allCompressedSizes[index]
  }, 0)

  const totalImages = Object.values(compressionBuckets).reduce(
    (acc, bucket) => acc + bucket.images.length,
    0
  )

  const jobIdDark = useJobStore((state) => state.jobIdDark)
  const triggerDarkImagesIdentify = useJobStore((state) => state.triggerDarkImagesIdentify)
  const colorCorrectApplied = useJobStore((state) => state.colorCorrectApplied)
  const setColorCorrectApplied = useJobStore((state) => state.setColorCorrectApplied)

  const sourceFolderName = leafPath(sourceFolder) || ''
  const folderData = dateObserverFolderData(sourceFolderName)
  const titleAddendum =
    folderData.observerCode !== safeObserverCode(observerCode)
      ? `with new observer code: ${observerCode}`
      : undefined

  return (
    <Sidebar spacing={1}>
      <SidebarHeader
        title={sourceFolderName}
        titleAddendum={titleAddendum}
        subtitle={`choosing compression settings for`}
      />
      {status === STATUSES.LOADING && (
        <Box
          sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <CircularProgress />
        </Box>
      )}
      {status === STATUSES.COMPLETED && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            paddingBottom: 1,
            overflowY: 'auto',
          }}
        >
          {/* Bucket Summary Sections */}
          {Object.entries(compressionBuckets).map(([bucketKey, bucket]) => {
            const { selection, images, fileSizes, resolutions } = bucket

            let megapixelBracketText = ''
            if (bucket.bottomThreshold === 0) {
              megapixelBracketText += 'each smaller than'
              megapixelBracketText += ` ${compressionBuckets[bucket.bucketAbove].bottomThreshold / 1_000_000}`
            } else if (bucket.bucketAbove === null) {
              megapixelBracketText += 'each larger than'
              megapixelBracketText += ` ${bucket.bottomThreshold / 1_000_000}`
            } else {
              megapixelBracketText += 'each between'
              megapixelBracketText += ` ${bucket.bottomThreshold / 1_000_000}`
              megapixelBracketText += ' and'
              megapixelBracketText += ` ${compressionBuckets[bucket.bucketAbove].bottomThreshold / 1_000_000}`
            }
            megapixelBracketText += ' megapixels'

            let choiceAmount = COMPRESSION_OPTIONS[selection]?.compressionAmount
            if (choiceAmount === 'No') {
              choiceAmount = 'None'
            }

            const compressedSizes = calculateCompressedSizes(selection, fileSizes, resolutions)

            return (
              <Box key={bucketKey}>
                <Box sx={{ fontSize: '20px' }}>{bucket.name} Images Bucket</Box>
                <Box
                  sx={{
                    fontSize: '14px',
                    lineHeight: '14px',
                    fontWeight: 300,
                    color: 'text.secondary',
                  }}
                >
                  <Box component="span" sx={{ color: 'text.primary' }}>
                    {images.length} images
                  </Box>{' '}
                  {megapixelBracketText}
                </Box>
                {images.length > 0 && (
                  <>
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      Compression choice:
                    </Box>{' '}
                    <Box
                      component="span"
                      sx={{ color: choiceAmount === 'None' ? 'text.primary' : 'primary.main' }}
                    >
                      {choiceAmount}
                    </Box>
                    <Box sx={{ marginTop: 0.5, marginRight: 1 }}>
                      <FilesizeSwarmHistogram
                        sizesBefore={fileSizes}
                        sizesAfter={compressedSizes}
                      />
                    </Box>
                  </>
                )}
              </Box>
            )
          })}

          <Box>
            <Box sx={{ fontSize: '20px' }}>
              Total Expected Savings:{' '}
              <Box
                component="span"
                sx={{ color: totalSavings === 0 ? 'text.primary' : 'primary.main' }}
              >
                {totalSavings === 0 ? '' : '~'}
                {bytesToSize(totalSavings)}
              </Box>
            </Box>
            <Box sx={{ marginTop: 0.5, marginRight: 1 }}>
              <FilesizeSwarmHistogram
                sizesBefore={allOriginalSizes}
                sizesAfter={allCompressedSizes}
              />
            </Box>
          </Box>

          <Box>
            <Box sx={{ fontSize: '20px' }}>Dark Image Correction</Box>
            {jobIdDark == null ? (
              <Button
                color="secondary"
                variant="outlined"
                sx={{ textTransform: 'none', boxShadow: 'none' }}
                onClick={triggerDarkImagesIdentify}
              >
                Check for Dark Images
              </Button>
            ) : (
              <Box
                sx={{
                  fontSize: '14px',
                  lineHeight: '14px',
                  fontWeight: 300,
                  color: 'text.secondary',
                }}
              >
                {darkNumStatus === STATUSES.COMPLETED ? (
                  <>
                    Found{' '}
                    <Box component="span" sx={{ color: 'text.primary' }}>
                      {darkNum} dark images
                    </Box>
                  </>
                ) : (
                  <Box component="span" sx={{ fontStyle: 'italic' }}>
                    Identifying dark images...
                  </Box>
                )}
                {darkNumStatus !== STATUSES.COMPLETED && (
                  <Box sx={{ marginTop: '2px' }}>
                    checked {darkNumProgress} of {totalImages} images
                  </Box>
                )}
              </Box>
            )}

            {darkNum > 0 && (
              <RadioGroup
                value={`${colorCorrectApplied}`}
                onChange={(event) => setColorCorrectApplied(event.target.value === 'true')}
                sx={{ marginTop: 0.5, marginLeft: 0.5, marginBottom: 0.5, position: 'relative' }}
              >
                <FormControlLabel
                  label="No Correction"
                  value="false"
                  control={<Radio size="small" sx={{ position: 'absolute', padding: '4px' }} />}
                  sx={{
                    color: `${colorCorrectApplied}` === 'false' ? 'text.primary' : 'text.secondary',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                  slotProps={{
                    typography: {
                      sx: (theme) => ({ marginLeft: `calc(${theme.spacing(2)} + 4px)` }),
                    },
                  }}
                />
                <FormControlLabel
                  label="Auto Exposure"
                  value="true"
                  control={<Radio size="small" sx={{ position: 'absolute', padding: '4px' }} />}
                  sx={{
                    color: `${colorCorrectApplied}` === 'true' ? 'text.primary' : 'text.secondary',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                  slotProps={{
                    typography: {
                      sx: (theme) => ({ marginLeft: `calc(${theme.spacing(2)} + 4px)` }),
                    },
                  }}
                />

                <Box
                  sx={(theme) => ({
                    marginLeft: `calc(${theme.spacing(2)} + 4px)`,
                    fontSize: '14px',
                    lineHeight: '14px',
                    fontWeight: 300,
                    color: 'text.secondary',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                  })}
                >
                  {darkSampleStatus === STATUSES.COMPLETED ? (
                    <>
                      <Box>Dark image proofs created</Box>
                      <TinyTextButton
                        onClick={onDarkSampleOpen}
                        disabled={`${colorCorrectApplied}` !== 'true'}
                      >
                        {darkNumSelected === darkNum ? 'All' : ''} {darkNumSelected} images selected
                      </TinyTextButton>
                    </>
                  ) : (
                    <Box sx={{ fontStyle: 'italic' }}>Creating proofs of dark images...</Box>
                  )}
                  {darkSampleStatus !== STATUSES.COMPLETED && (
                    <Box>
                      created {darkSampleProgress} of {darkNum} images
                    </Box>
                  )}
                </Box>
              </RadioGroup>
            )}
          </Box>

          {canRecreateBuckets && (
            <Button
              color="secondary"
              sx={{ textTransform: 'none', boxShadow: 'none', alignSelf: 'flex-start' }}
              startIcon={<AutorenewIcon />}
              onClick={recreateBuckets}
              disabled={!canRecreateBuckets}
            >
              Recreate Bucket Examples with Bright Images
            </Button>
          )}
        </Box>
      )}

      {/* This represents an error status, but we overload the value with the message */}
      {![STATUSES.LOADING, STATUSES.COMPLETED].includes(status) && (
        <Box>
          <Alert severity="error">
            <AlertTitle>Error Creating Sample Images</AlertTitle>
            {status}
          </Alert>
        </Box>
      )}
      {![STATUSES.LOADING, STATUSES.COMPLETED].includes(darkNumStatus) && (
        <Box>
          <Alert severity="error">
            <AlertTitle>Error Identifying Dark Images</AlertTitle>
            {darkNumStatus}
          </Alert>
        </Box>
      )}
      {![STATUSES.LOADING, STATUSES.COMPLETED].includes(darkSampleStatus) && (
        <Box>
          <Alert severity="error">
            <AlertTitle>Error creating Dark Image Proofs</AlertTitle>
            {darkSampleStatus}
          </Alert>
        </Box>
      )}

      {status === STATUSES.COMPLETED && (
        <PhaseTriggerSection
          actionName={actionName}
          canTrigger={canTrigger}
          onTriggerAction={onTriggerAction}
          multiDayImport={multiDayImport}
          setMultiDayImport={setMultiDayImport}
          showMultiDayImport
        />
      )}
    </Sidebar>
  )
}

export default CompressionSidebar
