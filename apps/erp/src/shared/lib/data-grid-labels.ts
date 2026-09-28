import type { TFunction } from 'i18next';
import type { DataGridLabels, FilterBarLabels, SavedViewsLabels } from '@mekong-erp/ui';

export function buildDataGridLabels(t: TFunction): DataGridLabels {
  return {
    resetLayout: t('dataGrid.resetLayout'),
    rowsPerPage: t('dataGrid.rowsPerPage'),
    rangeOfTotal: (from, to, total) => t('dataGrid.rangeOfTotal', { from, to, total }),
    pageIndicator: (page, pageCount) => t('dataGrid.pageIndicator', { page, pageCount }),
    firstPage: t('dataGrid.firstPage'),
    previousPage: t('dataGrid.previousPage'),
    nextPage: t('dataGrid.nextPage'),
    lastPage: t('dataGrid.lastPage'),
    selectedCount: (count) => t('dataGrid.selectedCount', { count }),
    clearSelection: t('dataGrid.clearSelection'),
    bulkActionWorking: t('dataGrid.bulkActionWorking'),
    bulkActionResult: (succeeded, failed) =>
      failed > 0
        ? t('dataGrid.bulkActionSucceededAndFailed', { succeeded, failed })
        : t('dataGrid.bulkActionSucceeded', { succeeded }),
    chooseColumns: t('dataGrid.chooseColumns'),
    columnsMenuLabel: t('dataGrid.columnsMenuLabel'),
    switchToCompactDensity: t('dataGrid.switchToCompactDensity'),
    switchToComfortableDensity: t('dataGrid.switchToComfortableDensity'),
    exportCsv: t('dataGrid.exportCsv'),
    selectAllRows: t('dataGrid.selectAllRows'),
    selectRow: t('dataGrid.selectRow'),
    pinColumn: t('dataGrid.pinColumn'),
    unpinColumn: t('dataGrid.unpinColumn'),
    resizeColumn: (columnId) => t('dataGrid.resizeColumn', { columnId }),
  };
}

export function buildFilterBarLabels(t: TFunction): FilterBarLabels {
  return {
    clearFilters: t('dataGrid.clearFilters'),
    any: t('dataGrid.any'),
    clearOption: t('dataGrid.clearOption'),
    minimumLabel: (label) => t('dataGrid.minimumLabel', { label }),
    maximumLabel: (label) => t('dataGrid.maximumLabel', { label }),
    selectedCount: (label, count) => t('dataGrid.selectedOptionCount', { label, count }),
  };
}

export function buildSavedViewsLabels(t: TFunction): SavedViewsLabels {
  return {
    viewsButton: t('dataGrid.viewsButton'),
    savedViewsMenuLabel: t('dataGrid.savedViewsMenuLabel'),
    noSavedViews: t('dataGrid.noSavedViews'),
    deleteView: (name) => t('dataGrid.deleteView', { name }),
    saveCurrentView: t('dataGrid.saveCurrentView'),
    namePrompt: t('dataGrid.namePrompt'),
  };
}
