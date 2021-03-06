import { Component, Input } from '@angular/core';
import { Demand } from '@demands/shared/demand';

@Component({
  selector: 'app-demand-selection',
  templateUrl: './demand-selection.component.html',
  styleUrls: ['./demand-selection.component.scss'],
})
export class DemandSelectionOnMapComponent {
  @Input() selectedDemands: Demand[] = [];
}
