import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

import useJobStore from '../store/job'
import { leafPath } from '../utilities/paths'
import { bytesToSize } from '../utilities/strings'
import STATUSES, { ERRORS, WARNINGS } from '../constants/statuses'
import Sidebar from '../components/Sidebar'
import SidebarHeader from '../components/SidebarHeader'
import IssueSummaryControls from '../components/IssueSummaryControls'
import StyledButton from '../components/StyledButton'
import BatchRenameController from '../components/BatchRenameController'

const IngestParseSidebar = ({
  status,
  totalSize,
  allWarnings,
  allErrors,
  oneFileName,
  actionName,
  canTrigger,
  onTriggerAction,
}) => {
  const jobMode = useJobStore((state) => state.jobMode)
  const sourceFolder = useJobStore((state) => state.sourceFolder)
  const triggerParse = useJobStore((state) => state.triggerParse)

  const metadataFilter = useJobStore((state) => state.metadataFilter)
  const setMetadataFilter = useJobStore((state) => state.setMetadataFilter)
  const issueIgnoreList = useJobStore((state) => state.issueIgnoreList)
  const addToIgnoreList = useJobStore((state) => state.addToIgnoreList)
  const removeFromIgnoreList = useJobStore((state) => state.removeFromIgnoreList)

  const batchRenameRules = useJobStore((state) => state.batchRenameRules)
  const setOneBatchRenameRule = useJobStore((state) => state.setOneBatchRenameRule)
  const applyBatchRenameRules = useJobStore((state) => state.applyBatchRenameRules)
  const processBatchRenameOnString = useJobStore((state) => state.processBatchRenameOnString)
  const oneNewName = useMemo(() => {
    return processBatchRenameOnString(oneFileName)
  }, [oneFileName, JSON.stringify(batchRenameRules)])

  return (
    <Sidebar spacing={1}>
      <SidebarHeader title={leafPath(sourceFolder)} subtitle={`${jobMode} metadata for`} />
      {status === STATUSES.LOADING && (
        <Box
          sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <CircularProgress />
        </Box>
      )}
      {status === STATUSES.COMPLETED && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ fontSize: '20px' }}>
              Ingesting {bytesToSize(totalSize, 2)} of {jobMode}
            </Box>
            <Box>
              <Button
                sx={(theme) => ({
                  paddingLeft: 1,
                  // This 4px is the gap between the icon and it's "container"
                  paddingRight: `calc(${theme.spacing(1)} - 4px)`,
                  marginRight: `calc(${theme.spacing(-1)} + 4px)`,
                })}
                onClick={triggerParse}
              >
                Re-Parse
                <RefreshIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
              </Button>
            </Box>
          </Box>

          <IssueSummaryControls
            title="Warnings"
            orderedIssuesWithCounts={[...allWarnings.entries()]}
            issueConstants={WARNINGS}
            ignorable
            metadataFilter={metadataFilter}
            setMetadataFilter={setMetadataFilter}
            issueIgnoreList={issueIgnoreList}
            addToIgnoreList={addToIgnoreList}
            removeFromIgnoreList={removeFromIgnoreList}
          />
          <IssueSummaryControls
            title="Errors"
            orderedIssuesWithCounts={[...allErrors.entries()]}
            issueConstants={ERRORS}
            metadataFilter={metadataFilter}
            setMetadataFilter={setMetadataFilter}
          />

          <BatchRenameController
            oneFileName={oneFileName}
            oneNewName={oneNewName}
            batchRenameRules={batchRenameRules}
            setOneBatchRenameRule={setOneBatchRenameRule}
            applyBatchRenameRules={applyBatchRenameRules}
          />

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

      {/* This represents an error status, but we overload the value with the message */}
      {![STATUSES.LOADING, STATUSES.COMPLETED].includes(status) && (
        <Box>
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {status}
          </Alert>
        </Box>
      )}
    </Sidebar>
  )
}

export default IngestParseSidebar
