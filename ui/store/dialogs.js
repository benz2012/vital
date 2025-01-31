import { valueSetter } from './utils'

const initialState = {
  exportStillDialogOpen: false,
  exportStillPreviewImage: null,
  regionEditDialog: false,
  confirmationDialogOpen: false,
  confirmationDialogProps: null,
  alertDialogOpen: false,
  alertDialogProps: null,
  jobQueueOpen: false,
  multiDayImportOpen: false,
}

const createDialogsStore = (set, get) => ({
  ...initialState,
  resetDialogsStore: () => set(initialState),

  setExportStillDialogOpen: valueSetter(set, 'exportStillDialogOpen'),
  setExportStillPreviewImage: valueSetter(set, 'exportStillPreviewImage'),

  setRegionEditDialog: valueSetter(set, 'regionEditDialog'),
  clearEditDialogs: () => set({ regionEditDialog: false }),

  setConfirmationDialogOpen: valueSetter(set, 'confirmationDialogOpen'),
  setConfirmationDialogProps: valueSetter(set, 'confirmationDialogProps'),

  setJobQueueOpen: valueSetter(set, 'jobQueueOpen'),

  setMultiDayImportOpen: valueSetter(set, 'multiDayImportOpen'),

  makeAlert: (body, variant = undefined, id = undefined) => {
    if (get().alertDialogOpen) return // prevent a new dialog from overwritting an existing one
    set({
      alertDialogOpen: true,
      alertDialogProps: { body, variant, id },
    })
  },
  closeAlert: () => set({ alertDialogOpen: false }),
})

export default createDialogsStore
