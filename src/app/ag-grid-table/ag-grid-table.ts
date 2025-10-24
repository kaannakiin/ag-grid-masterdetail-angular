import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  IRowNode,
  IsFullWidthRowParams,
  RowClickedEvent,
  SortChangedEvent,
} from 'ag-grid-community';
import { DetailCellRenderer } from './app-detail-cell';

interface TableData {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

interface DetailRow {
  isDetailRow: true;
  parentId: number;
  parentData: TableData;
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

type GridRowData = TableData | DetailRow;

@Component({
  selector: 'ag-grid-table',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './ag-grid-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgGridTable {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  private gridApi!: GridApi;

  private expandedRowNodeIds = new Map<number, string>();

  public columns: ColDef[] = [
    {
      field: 'id',
      width: 70,
      headerName: 'ID',
    },
    {
      field: 'userId',
      width: 90,
      headerName: 'User ID',
    },
    {
      field: 'completed',
      width: 110,
      headerName: 'Durum',
    },
    {
      field: 'title',
      flex: 1,
      headerName: 'Başlık',
    },
  ];

  public gridOptions: GridOptions = {
    columnDefs: this.columns,
    getRowId: (params) => {
      if (!this.isDetailRow(params.data)) {
        return `row-${params.data.id}`;
      }
      return `detail-${params.data.parentId}`;
    },
    isFullWidthRow: (params: IsFullWidthRowParams) => {
      return this.isDetailRow(params.rowNode.data);
    },
    fullWidthCellRenderer: DetailCellRenderer,
    getRowHeight: (params) => {
      if (this.isDetailRow(params.data)) {
        return 150;
      }
      return 42;
    },
    animateRows: true,
    isRowSelectable: (params) => {
      return !this.isDetailRow(params.data);
    },
  };

  onGridReady(params: GridReadyEvent<GridRowData[]>) {
    this.gridApi = params.api;

    this.http
      .get<TableData[]>('https://jsonplaceholder.typicode.com/todos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: TableData[]) => {
        this.gridApi.setGridOption('rowData', data);
      });
  }

  onRowClicked(event: RowClickedEvent<GridRowData>) {
    if (!event.node.data || this.isDetailRow(event.node.data)) {
      return;
    }

    const clickedData = event.node.data as TableData;
    const isCurrentlyExpanded = this.expandedRowNodeIds.has(clickedData.id);

    if (isCurrentlyExpanded) {
      this.collapseRow(clickedData.id);
    } else {
      this.expandRow(event.node, clickedData);
    }
  }

  private expandRow(parentNode: IRowNode<GridRowData>, data: TableData) {
    const detailRow: DetailRow = {
      isDetailRow: true,
      parentId: data.id,
      parentData: data,
      id: data.id,
      userId: data.userId,
      title: data.title,
      completed: data.completed,
    };

    const result = this.gridApi.applyTransaction({
      add: [detailRow],
    });

    if (result && result.add && result.add.length > 0) {
      const addedNode = result.add[0];
      if (addedNode.id) {
        this.expandedRowNodeIds.set(data.id, addedNode.id);

        this.moveDetailRowNextToParent(data.id);
      }
    }
  }

  private moveDetailRowNextToParent(parentId: number) {
    const allRows: GridRowData[] = [];

    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      allRows.push(node.data);
    });

    const parentIndex = allRows.findIndex((row) => !this.isDetailRow(row) && row.id === parentId);

    const detailIndex = allRows.findIndex(
      (row) => this.isDetailRow(row) && row.parentId === parentId
    );

    if (parentIndex === -1 || detailIndex === -1) {
      return;
    }

    if (detailIndex === parentIndex + 1) {
      return;
    }

    const [detailRow] = allRows.splice(detailIndex, 1);
    allRows.splice(parentIndex + 1, 0, detailRow);

    this.gridApi.setGridOption('rowData', allRows);
  }

  private collapseRow(parentId: number) {
    const detailNodeId = this.expandedRowNodeIds.get(parentId);

    if (!detailNodeId) {
      console.warn(`No expanded detail found for parent ID: ${parentId}`);
      return;
    }

    const detailNode = this.gridApi.getRowNode(detailNodeId);

    if (!detailNode || !detailNode.data) {
      console.warn(`Detail node not found with ID: ${detailNodeId}`);
      this.expandedRowNodeIds.delete(parentId);
      return;
    }

    this.gridApi.applyTransaction({
      remove: [detailNode.data],
    });

    this.expandedRowNodeIds.delete(parentId);

    const parentNode = this.gridApi.getRowNode(`row-${parentId}`);
    if (parentNode) {
      try {
        this.gridApi.setRowNodeExpanded(parentNode, false, false);
      } catch (e) {}
    }
  }
  public collapseAllRows() {
    if (!this.gridApi || this.expandedRowNodeIds.size === 0) return;

    const detailRowsToRemove: GridRowData[] = [];
    const parentIds: number[] = [];

    this.expandedRowNodeIds.forEach((nodeId, parentId) => {
      const node = this.gridApi.getRowNode(nodeId);
      if (node && node.data) {
        detailRowsToRemove.push(node.data);
        parentIds.push(parentId);
      }
    });

    if (detailRowsToRemove.length > 0) {
      this.gridApi.applyTransaction({
        remove: detailRowsToRemove,
      });

      parentIds.forEach((parentId) => {
        const parentNode = this.gridApi.getRowNode(`row-${parentId}`);
        if (parentNode) {
          try {
            this.gridApi.setRowNodeExpanded(parentNode, false, false);
          } catch (e) {}
        }
      });
    }

    this.expandedRowNodeIds.clear();
  }

  private isDetailRow(data: any): data is DetailRow {
    return data && data.isDetailRow === true;
  }
}
