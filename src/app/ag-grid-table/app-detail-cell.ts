import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-detail-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-gray-50 border-l-4 border-blue-500 h-full">
      <h3 class="font-bold text-lg mb-2">Detay Bilgiler</h3>
      <div class="grid grid-cols-2 gap-2">
        <div><strong>User ID:</strong> {{ parentData.userId }}</div>
        <div><strong>Task ID:</strong> {{ parentData.id }}</div>
        <div>
          <strong>Durum:</strong>
          <span [class]="parentData.completed ? 'text-green-600' : 'text-red-600'">
            {{ parentData.completed ? 'Tamamlandı' : 'Bekliyor' }}
          </span>
        </div>
        <div class="col-span-2"><strong>Açıklama:</strong> {{ parentData.title }}</div>
      </div>
    </div>
  `,
})
export class DetailCellRenderer {
  public params!: ICellRendererParams;
  public parentData: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.parentData = params.data.parentData;
  }
}
