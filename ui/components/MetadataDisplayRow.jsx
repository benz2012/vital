import React from 'react'
import Box from '@mui/material/Box'

import StatusIcon from './StatusIcon'
import StyledTooltip from './StyledTooltip'
import { ERRORS, WARNINGS } from '../constants/statuses'
import {
  TABLE_ROW_HEIGHT,
  TABLE_ROW_INNER_HEIGHT,
  TABLE_ROW_VERT_PAD,
  TABLE_ROW_BOT_BORDER,
  STATUS_COLUMN_WIDTH,
  ERRORS_COLUMN_WIDTH,
} from '../constants/dimensions'
import { getRowId } from '../utilities/transformers'

const DefaultCell = React.forwardRef(({ children, align, width, sx, ...rest }, ref) => (
  <Box
    role="cell"
    ref={ref}
    sx={(theme) => ({
      // consistent styles
      fontFamily: theme.typography.monoFamily,
      fontSize: '12px',
      minHeight: `${TABLE_ROW_HEIGHT}px`,
      lineHeight: `${TABLE_ROW_INNER_HEIGHT}px`,
      whiteSpace: 'nowrap',
      paddingTop: `${TABLE_ROW_VERT_PAD}px`,
      paddingBottom: `${TABLE_ROW_VERT_PAD}px`,
      borderBottom: `${TABLE_ROW_BOT_BORDER}px solid ${theme.palette.divider}`,
      flexGrow: 0,
      flexShrink: 0,

      // variable styles per-cell/per-column
      width,
      textAlign: align ?? 'left',
      ...(sx ?? {}),
    })}
    {...rest}
  >
    {children}
  </Box>
))
DefaultCell.displayName = 'DefaultCell'

const CellWithTooltip = ({ children, ...rest }) => {
  return (
    <StyledTooltip title={`${children}`} darker enterDelay={750} placement="right-start">
      <DefaultCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }} {...rest}>
        {children}
      </DefaultCell>
    </StyledTooltip>
  )
}

const MetadataDisplayRow = ({ data, index, style }) => {
  const { items, columns, selectedRows, onRowClick, onRowShiftClick } = data
  const row = items[index]
  const rowId = getRowId(row)
  const isSelected = selectedRows.includes(rowId)

  const handleRowClick = (event) => {
    if (event.shiftKey) {
      onRowShiftClick(rowId)
    } else {
      onRowClick(rowId)
    }
  }

  const aligns = columns.map((column) => column.align)
  const widths = columns.map((column) => column.width)
  const truncateTooltips = columns.map((column) => column.truncateTooltip)
  const values = columns.map((column) => {
    let value = row[column.key]
    if (column.overwriteKey) {
      value = row[column.overwriteKey] ?? value
    }
    if ('transformer' in column) {
      return column.transformer(value)
    }
    return value
  })

  const warnings = row.warnings.map((warning) => WARNINGS.get(warning).message)
  const errors = row.errors.map((error) => ERRORS.get(error).message)
  const status = row.status

  return (
    <Box
      role="row"
      style={style}
      sx={{
        display: 'flex',
        backgroundColor: isSelected ? 'secondary.dark25' : 'inherit',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={handleRowClick}
    >
      <DefaultCell width={STATUS_COLUMN_WIDTH} sx={{ paddingLeft: '2px' }}>
        <StatusIcon status={status} />
      </DefaultCell>

      {values.map((value, index) => {
        const align = aligns[index]
        const width = widths[index]
        const truncateTooltip = truncateTooltips[index]
        const CellClass = truncateTooltip ? CellWithTooltip : DefaultCell
        return (
          <CellClass key={`${index}-${value}`} align={align} width={width}>
            {value}
          </CellClass>
        )
      })}

      <DefaultCell width={ERRORS_COLUMN_WIDTH} sx={{ paddingLeft: 1 }}>
        <Box sx={{ whiteSpace: 'pre', color: 'warning.main' }}>{warnings.join('\n')}</Box>
        <Box sx={{ whiteSpace: 'pre', color: 'error.main' }}>{errors.join('\n')}</Box>
      </DefaultCell>
    </Box>
  )
}

export default MetadataDisplayRow
