import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestsComponent } from './requests.component';
import { RequestDetailsComponent } from './request-details/request-details.component';
import { RequestsListComponent } from './requests-list/requests-list.component';
import { RequestsRoutingModule } from './requests-routing.module';
import { MaterialComponentsModule } from '@shared/material.module';
import { SharedModule } from '@shared/shared.module';
import { RequestModalInfoComponent } from './request-modal-info/request-modal-info.component';

@NgModule({
  declarations: [
    RequestsComponent,
    RequestDetailsComponent,
    RequestsListComponent,
    RequestModalInfoComponent
  ],
  imports: [
    CommonModule,
    RequestsRoutingModule,
    MaterialComponentsModule,
    SharedModule
  ],
  providers: []
})
export class RequestsModule {}
