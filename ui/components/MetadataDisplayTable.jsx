import { useEffect, useMemo, useState, useRef } from 'react'
import { VariableSizeList as VirtualList } from 'react-window'
import Box from '@mui/material/Box'

import STATUSES from '../constants/statuses'
import {
  TITLEBAR_HEIGHT,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_ROW_INNER_HEIGHT,
  STATUS_COLUMN_WIDTH,
  ERRORS_COLUMN_WIDTH,
} from '../constants/dimensions'
import { getRowId } from '../utilities/transformers'
import MetadataDisplayHeader from './MetadataDisplayHeader'
import MetadataDisplayRow from './MetadataDisplayRow'

const standardComparator = (a, b, orderBy, orderByAlt, transformer) => {
  const currentA = orderByAlt ? a[orderByAlt] : a[orderBy]
  const currentB = orderByAlt ? b[orderByAlt] : b[orderBy]
  const trueA = transformer ? transformer(currentA) : currentA
  const trueB = transformer ? transformer(currentB) : currentB
  if (trueB < trueA) return -1
  if (trueB > trueA) return 1
  return 0
}

const getDirectionalSorter = (order, orderBy, orderByAlt, transformer) => {
  return order === 'desc'
    ? (a, b) => standardComparator(a, b, orderBy, orderByAlt, transformer)
    : (a, b) => -standardComparator(a, b, orderBy, orderByAlt, transformer)
}

const statusTransformer = (status) => {
  if (status === STATUSES.SUCCESS) return 0
  if (status === STATUSES.WARNING) return 1
  if (status === STATUSES.ERROR) return 2
  return 3
}

const MetadataDisplayTable = ({
  columns,
  data,
  isSubfolder,
  hasMainHorizontalScroll,
  selectedRows,
  setRowSelection,
  onRowClick,
}) => {
  // Sort by File Name as Default (aka index 0)
  const [order, setOrder] = useState('asc')
  const [orderBy, setOrderBy] = useState(columns[0].key)
  const [orderByAlt, setOrderByAlt] = useState(columns[0].key)

  const createSortHandler =
    (property, altProperty = null) =>
    () => {
      const isAsc = orderBy === property && order === 'asc'
      setOrder(isAsc ? 'desc' : 'asc')
      setOrderBy(property)
      setOrderByAlt(altProperty)
    }

  const sortedData = useMemo(() => {
    const columnData = columns.find((column) => column.key === orderBy)
    const transformer = orderBy === 'status' ? statusTransformer : columnData?.comparatorTransformer
    const directionalSorter = getDirectionalSorter(order, orderBy, orderByAlt, transformer)
    return data.slice().sort(directionalSorter)
  }, [JSON.stringify(columns), JSON.stringify(data), order, orderBy])

  const virtualListRef = useRef(null)
  useEffect(() => {
    virtualListRef.current?.resetAfterIndex(0)
  }, [JSON.stringify(sortedData)])
  const virtualListWidth =
    columns.reduce((acc, column) => acc + column.width, 0) +
    STATUS_COLUMN_WIDTH +
    ERRORS_COLUMN_WIDTH +
    20
  // ^ this 20 in virtualListWidth accounts for the scrollbar in the other dimension, there are like 2 or 3 hard to work with scrollbar
  //   interactions because of the virtual list, static sizing (but dynamic content), etc, and I've spent too much time on it already

  const availableViewportHeight =
    document.body.clientHeight -
    TITLEBAR_HEIGHT -
    TABLE_HEADER_HEIGHT -
    (isSubfolder ? 30 : 0) -
    (hasMainHorizontalScroll ? 20 : 0)
  // expectedTableContentHeight is so that we can render smaller tables when it's a small list. We could calculate a size based on number of rows
  // but it's too expensive, since each row could have dynamic height. So instead we just use use a half-height when num rows is small
  // this of course looks bad when there's only one metadata table, but each table doesn't know about the others, so I don't have a solution for that
  const expectedTableContentHeight =
    sortedData.length < 10 ? availableViewportHeight / 2 : Number.MAX_SAFE_INTEGER
  const virtualListHeight = Math.min(availableViewportHeight, expectedTableContentHeight)

  const onRowShiftClick = (rowId) => {
    const rowIndexClicked = sortedData.findIndex((row) => getRowId(row) === rowId)

    const firstSelectedRowIndex = sortedData.findIndex((row) =>
      selectedRows.includes(getRowId(row))
    )
    const lastSelectedRowIndexReversed = sortedData
      .slice()
      .reverse()
      .findIndex((row) => {
        const aSelectedRowWasFound = selectedRows.includes(getRowId(row))
        return aSelectedRowWasFound
      })
    const indexesLength = sortedData.length - 1
    const lastSelectedRowIndex = indexesLength - lastSelectedRowIndexReversed

    const newSelectedRows = []
    if (firstSelectedRowIndex < 0) {
      newSelectedRows.push(rowId)
    } else {
      for (
        let i = Math.min(firstSelectedRowIndex, rowIndexClicked);
        i <= Math.max(lastSelectedRowIndex, rowIndexClicked);
        i++
      ) {
        newSelectedRows.push(getRowId(sortedData[i]))
      }
    }

    setRowSelection(newSelectedRows)
  }

  return (
    <Box role="table" sx={{ width: '100%' }}>
      <MetadataDisplayHeader
        columns={columns}
        order={order}
        orderBy={orderBy}
        createSortHandler={createSortHandler}
      />

      <Box role="rowgroup" sx={{ width: '100%' }}>
        <VirtualList
          ref={virtualListRef}
          itemData={{
            items: sortedData,
            columns,
            selectedRows,
            onRowClick,
            onRowShiftClick,
          }}
          itemCount={sortedData.length}
          overscanCount={10}
          width={virtualListWidth}
          height={virtualListHeight}
          itemSize={(index) => {
            const row = sortedData[index]
            const numWarnings = row.warnings.length
            const numErrors = row.errors.length
            return Math.max(
              (numWarnings + numErrors - 1) * TABLE_ROW_INNER_HEIGHT + TABLE_ROW_HEIGHT,
              TABLE_ROW_HEIGHT
            )
          }}
        >
          {MetadataDisplayRow}
        </VirtualList>
      </Box>
    </Box>
  )
}

export default MetadataDisplayTable
