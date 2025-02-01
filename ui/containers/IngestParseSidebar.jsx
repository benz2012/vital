import { useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

import useJobStore from '../store/job'
import { leafPath, dateObserverFolderData, safeObserverCode } from '../utilities/paths'
import { bytesToSize, titleCase } from '../utilities/strings'
import STATUSES, { ERRORS, WARNINGS } from '../constants/statuses'
import { JOB_MODES } from '../constants/routes'

import Sidebar from '../components/Sidebar'
import SidebarHeader from '../components/SidebarHeader'
import IssueSummaryControls from '../components/IssueSummaryControls'
import BatchRenameController from '../components/BatchRenameController'
import BatchRenameList from '../components/BatchRenameList'
import PhaseTriggerSection from '../components/PhaseTriggerSection'

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
  const observerCode = useJobStore((state) => state.observerCode)
  const triggerParse = useJobStore((state) => state.triggerParse)
  const multiDayImport = useJobStore((state) => state.multiDayImport)
  const setMultiDayImport = useJobStore((state) => state.setMultiDayImport)

  const metadataFilter = useJobStore((state) => state.metadataFilter)
  const setMetadataFilter = useJobStore((state) => state.setMetadataFilter)
  const issueIgnoreList = useJobStore((state) => state.issueIgnoreList)
  const addToIgnoreList = useJobStore((state) => state.addToIgnoreList)
  const removeFromIgnoreList = useJobStore((state) => state.removeFromIgnoreList)

  const selectedRows = useJobStore((state) => state.selectedRows)
  const clearRowSelection = useJobStore((state) => state.clearRowSelection)

  const batchRenameRules = useJobStore((state) => state.batchRenameRules)
  const addBatchRenameRuleset = useJobStore((state) => state.addBatchRenameRuleset)
  const removeBatchRenameRuleset = useJobStore((state) => state.removeBatchRenameRuleset)
  const batchRenameRulesValidated = useJobStore((state) => state.batchRenameRulesValidated)

  const sourceFolderName = leafPath(sourceFolder) || ''
  const folderData = dateObserverFolderData(sourceFolderName)
  const titleAddendum =
    folderData.observerCode !== safeObserverCode(observerCode)
      ? `with new observer code: ${observerCode}`
      : undefined

  const contentBodyRef = useRef(null)
  const hasScrollbars =
    contentBodyRef.current?.scrollHeight - contentBodyRef.current?.clientHeight > 0

  return (
    <Sidebar spacing={1}>
      <SidebarHeader
        title={sourceFolderName}
        titleAddendum={titleAddendum}
        subtitle={`${jobMode} metadata for`}
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
          ref={contentBodyRef}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            paddingBottom: 1,
            overflowY: 'auto',
            ...(hasScrollbars ? { paddingRight: 1, marginRight: -1 } : {}),
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ fontSize: '18px', color: 'text.secondary' }}>
              Ingesting {bytesToSize(totalSize, 2)} of {jobMode}
              {jobMode === JOB_MODES.BY_IMAGE ? 's' : ''}
            </Box>
            <Box>
              <Button onClick={triggerParse}>
                <Box>Re-Parse</Box>
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
            addBatchRenameRuleset={addBatchRenameRuleset}
            selectedRows={selectedRows}
            clearRowSelection={clearRowSelection}
          />
          <BatchRenameList
            batchRenameRules={batchRenameRules}
            removeBatchRenameRuleset={removeBatchRenameRuleset}
            batchRenameRulesValidated={batchRenameRulesValidated}
          />
        </Box>
      )}

      {status === STATUSES.COMPLETED && (
        <PhaseTriggerSection
          actionName={actionName}
          canTrigger={canTrigger}
          onTriggerAction={onTriggerAction}
          multiDayImport={multiDayImport}
          setMultiDayImport={setMultiDayImport}
          showMultiDayImport={jobMode === JOB_MODES.BY_VIDEO}
        />
      )}

      {/* This represents an error status, but we overload the value with the message */}
      {![STATUSES.LOADING, STATUSES.COMPLETED].includes(status) && (
        <Box>
          <Alert severity="error">
            <AlertTitle>Error Parsing {titleCase(jobMode)} Metadata</AlertTitle>
            {status}
          </Alert>
        </Box>
      )}
    </Sidebar>
  )
}

export default IngestParseSidebar
