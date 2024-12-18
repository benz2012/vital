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
import { leafPath } from '../utilities/paths'
import { bytesToSize } from '../utilities/strings'
import STATUSES from '../constants/statuses'
import { IMAGE_QUALITIES, BUCKET_THRESHOLDS, HISTOGRAM_THRESHOLDS } from '../constants/fileTypes'

import Sidebar from '../components/Sidebar'
import SidebarHeader from '../components/SidebarHeader'
import StyledButton from '../components/StyledButton'
import TinyTextButton from '../components/TinyTextButton'

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
  const buckets = ['small', 'medium', 'large']
  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const compressionBuckets = useJobStore((state) => state.compressionBuckets)

  let smallChoice = IMAGE_QUALITIES[compressionBuckets.small?.selection]?.compressionAmount
  let mediumChoice = IMAGE_QUALITIES[compressionBuckets.medium?.selection]?.compressionAmount
  let largeChoice = IMAGE_QUALITIES[compressionBuckets.large?.selection]?.compressionAmount

  if (smallChoice === 'No') {
    smallChoice = 'None'
  }
  if (mediumChoice === 'No') {
    mediumChoice = 'None'
  }
  if (largeChoice === 'No') {
    largeChoice = 'None'
  }

  let totalSavings = 0
  buckets.forEach((bucket) => {
    const savingsForBucket =
      compressionBuckets[bucket].size -
      compressionBuckets[bucket].size *
        IMAGE_QUALITIES[compressionBuckets[bucket]?.selection]?.compressionRatio
    totalSavings += savingsForBucket || 0
  })

  let totalImages = 0
  totalImages += compressionBuckets.small?.images?.length || 0
  totalImages += compressionBuckets.medium?.images?.length || 0
  totalImages += compressionBuckets.large?.images?.length || 0

  const smallBins = compressionBuckets.small?.sizes?.reduce(
    (acc, fileSize) => {
      let [bin1, bin2, bin3, bin4] = acc
      if (fileSize < HISTOGRAM_THRESHOLDS[1]) {
        bin1 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[2]) {
        bin2 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[3]) {
        bin3 += 1
      } else {
        bin4 += 1
      }
      return [bin1, bin2, bin3, bin4]
    },
    [0, 0, 0, 0]
  ) || [0, 0, 0, 0]

  const mediumBins = compressionBuckets.medium?.sizes?.reduce(
    (acc, fileSize) => {
      let [bin1, bin2, bin3, bin4] = acc
      if (fileSize < HISTOGRAM_THRESHOLDS[1]) {
        bin1 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[2]) {
        bin2 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[3]) {
        bin3 += 1
      } else {
        bin4 += 1
      }
      return [bin1, bin2, bin3, bin4]
    },
    [0, 0, 0, 0]
  ) || [0, 0, 0, 0]

  const largeBins = compressionBuckets.large?.sizes?.reduce(
    (acc, fileSize) => {
      let [bin1, bin2, bin3, bin4] = acc
      if (fileSize < HISTOGRAM_THRESHOLDS[1]) {
        bin1 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[2]) {
        bin2 += 1
      } else if (fileSize < HISTOGRAM_THRESHOLDS[3]) {
        bin3 += 1
      } else {
        bin4 += 1
      }
      return [bin1, bin2, bin3, bin4]
    },
    [0, 0, 0, 0]
  ) || [0, 0, 0, 0]

  const jobIdDark = useJobStore((state) => state.jobIdDark)
  const triggerDarkImagesIdentify = useJobStore((state) => state.triggerDarkImagesIdentify)
  const colorCorrectApplied = useJobStore((state) => state.colorCorrectApplied)
  const setColorCorrectApplied = useJobStore((state) => state.setColorCorrectApplied)

  return (
    <Sidebar spacing={1}>
      <SidebarHeader
        title={leafPath(sourceFolder)}
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
          <Box>
            <Box sx={{ fontSize: '20px' }}>Small Images Bucket</Box>
            <Box
              sx={{
                fontSize: '14px',
                lineHeight: '14px',
                fontWeight: 300,
                color: 'text.secondary',
              }}
            >
              <Box component="span" sx={{ color: 'text.primary' }}>
                {compressionBuckets.small?.images?.length} images
              </Box>{' '}
              each smaller than {BUCKET_THRESHOLDS.medium / 1_000_000} megapixels
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              Compression choice:
            </Box>{' '}
            <Box
              component="span"
              sx={{ color: smallChoice === 'None' ? 'text.primary' : 'primary.main' }}
            >
              {smallChoice}
            </Box>
            <Box>
              {smallBins.map((numInBin) => (
                <>{numInBin} | </>
              ))}
            </Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: '20px' }}>Medium Images Bucket</Box>
            <Box
              sx={{
                fontSize: '14px',
                lineHeight: '14px',
                fontWeight: 300,
                color: 'text.secondary',
              }}
            >
              <Box component="span" sx={{ color: 'text.primary' }}>
                {compressionBuckets.medium?.images?.length} images
              </Box>{' '}
              each between {BUCKET_THRESHOLDS.medium / 1_000_000} and{' '}
              {BUCKET_THRESHOLDS.large / 1_000_000} megapixels
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              Compression choice:
            </Box>{' '}
            <Box
              component="span"
              sx={{ color: mediumChoice === 'None' ? 'text.primary' : 'primary.main' }}
            >
              {mediumChoice}
            </Box>
            <Box>
              {mediumBins.map((numInBin) => (
                <>{numInBin} | </>
              ))}
            </Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: '20px' }}>Large Images Bucket</Box>
            <Box
              sx={{
                fontSize: '14px',
                lineHeight: '14px',
                fontWeight: 300,
                color: 'text.secondary',
              }}
            >
              <Box component="span" sx={{ color: 'text.primary' }}>
                {compressionBuckets.large?.images?.length} images
              </Box>{' '}
              each larger than {BUCKET_THRESHOLDS.large / 1_000_000} megapixels
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              Compression choice:
            </Box>{' '}
            <Box
              component="span"
              sx={{ color: largeChoice === 'None' ? 'text.primary' : 'primary.main' }}
            >
              {largeChoice}
            </Box>
            <Box>
              {largeBins.map((numInBin) => (
                <>{numInBin} | </>
              ))}
            </Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: '20px' }}>Total Expected Savings</Box>
            <Box sx={{ color: totalSavings === 0 ? 'text.primary' : 'secondary.main' }}>
              {totalSavings === 0 ? '' : '~'}
              {bytesToSize(totalSavings)}
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
                sx={{ marginTop: 0.5, marginLeft: 0.5, marginBottom: 0.5 }}
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
        <>
          <Box sx={{ flexGrow: 1 }} />
          <StyledButton
            variant="outlined"
            fullWidth
            disabled={!canTrigger}
            onClick={onTriggerAction}
          >
            {actionName}
          </StyledButton>
        </>
      )}
    </Sidebar>
  )
}

export default CompressionSidebar
