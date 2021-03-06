import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { from } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import Map from '@arcgis/core/Map';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import config from '@arcgis/core/config.js';

import { DemandsService } from '../../demands.service';
import { Demand } from '@demands/shared/demand';
import { DemandType, demandTypes } from '@demands/shared/demand-type';
import { Volunteer } from '@volunteers/shared/volunteer';
import { Zone } from '@shared/zone';

config.assetsPath = '/assets';

@Component({
  selector: 'app-demands-map',
  templateUrl: './demands-map.component.html',
  styleUrls: ['./demands-map.component.scss'],
})
export class DemandsMapComponent implements OnDestroy, OnInit {
  @Input() coordinates: [number, number] = [
    28.825140232956283,
    47.01266177894471,
  ];
  @ViewChild('map', { static: true }) private mapViewEl: ElementRef;
  @ViewChild('headerSelectionZone', { static: true })
  private headerSelection: ElementRef;
  private map: Map = null;
  private mapView: MapView;
  private graphicsLayer: GraphicsLayer = null;
  public demands: Demand[] = [];
  public zones = [
    {
      // Backend does not have such a zone, do not use it in REST communication
      value: 'toate',
      mapCoordinates: {
        latitude: 47.024758255143986,
        longitude: 28.83263462925968,
      },
    },
    {
      value: Zone.centru,
      mapCoordinates: {
        latitude: 47.01820503506154,
        longitude: 28.812844986831664,
      },
    },
    {
      value: Zone.telecentru,
      mapCoordinates: {
        latitude: 47.01820503506,
        longitude: 28.812844986831,
      },
    },
    {
      value: Zone.botanica,
      mapCoordinates: {
        latitude: 46.98634237915792,
        longitude: 28.85737532521311,
      },
    },
    {
      value: Zone.buiucani,
      mapCoordinates: {
        latitude: 47.027011033109694,
        longitude: 28.792694802549562,
      },
    },
    {
      value: Zone.ciocana,
      mapCoordinates: {
        latitude: 47.040753754886865,
        longitude: 28.833281219747807,
      },
    },
    {
      value: Zone.riscani,
      mapCoordinates: {
        latitude: 47.04642715050063,
        longitude: 28.89065903499436,
      },
    },
    {
      value: Zone.suburbii,
      mapCoordinates: {
        latitude: 47.024758255143986,
        longitude: 28.83263462925968,
      },
    },
  ];
  public demand: DemandType;
  demandTypes = demandTypes;
  form: FormGroup;
  public stepOnSelectionZone = 1;
  buttonSelectorTextOnMap = 'Următor';
  public selectedDemands: Demand[] = [];
  public selectedVolunteer: Volunteer = null;
  public selectedCityZone = '';
  public selectedDemandTypeFilter = '';
  public anyDemand = 'any';
  private simpleMarkerSymbol = {
    type: 'simple-marker',
    color: [255, 255, 255, 0.3],
    style: 'circle', //'circle', 'cross', 'diamond', 'path', 'square', 'triangle', 'x'
    outline: {
      color: [226, 119, 40], // orange
      width: 2,
    },
  };
  private changedMarkerSymbol = {
    type: 'simple-marker',
    color: [60, 210, 120, 0.7], // green
    outline: {
      color: [0, 0, 0, 0.7],
      width: 1,
    },
  };

  constructor(
    private demandsService: DemandsService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): any {
    this.stepOnSelectionZone = 1;

    this.form = new FormGroup({
      city_sector: new FormControl(''),
      needs: new FormControl(''),
    });

    // Initialize MapView
    this.graphicsLayer = new GraphicsLayer();
    void this.initializeMap();
  }

  async initializeMap() {
    try {
      //Geographic data stored temporarily in memory.
      //Displaying individual geographic features as graphics, visual aids or text on the map.
      this.initializeDemandsOnTheMap('init');

      this.map = await new Map({
        basemap: 'streets-navigation-vector', // possible: topo-vector
        layers: [this.graphicsLayer],
      });

      this.mapView = new MapView({
        center: this.coordinates,
        container: this.mapViewEl.nativeElement,
        zoom: 12,
        map: this.map,
      });

      this.mapView.on('click', (ev) => {
        this.mapView.hitTest(ev.screenPoint).then((res) => {
          if (
            res.results.length < 1 || // clicked to no object on the map
            res.results[0].graphic.attributes?.demandId === undefined
          )
            return;

          const gr: Graphic = res.results[0].graphic;
          if (gr) {
            const exist = this.selectedDemands.find(
              (r) => r._id === gr.attributes.demandId,
            );
            if (exist === undefined) {
              //in case of missed - add demand to the selected demands and make it green on map
              this.selectedDemands.push(
                this.demands.find((r) => r._id === gr.attributes.demandId),
              );
              this.selectedDemands = [...this.selectedDemands];
              gr.symbol.set('color', this.changedMarkerSymbol.color);
            } else {
              //in case of exist - remove demand from selected and make it white on map
              this.selectedDemands = this.selectedDemands.filter(
                (r) => r !== exist,
              );
              gr.symbol.set('color', this.simpleMarkerSymbol.color);
            }
            this.graphicsLayer.add(gr.clone());
            this.graphicsLayer.remove(gr);

            //next row needs to proceed detectChanges by Angular
            this.cdr.detectChanges();
          }
        });
        //center map view to selected point
        this.mapView.goTo({ center: ev.mapPoint });
      });
    } catch (error) {
      console.error(error);
    }
  }

  initializeDemandsOnTheMap(
    status: 'init' | 'filter',
    filters: any = {},
  ): void {
    if (status === 'init') {
      this.selectedDemands = [];
    } else {
      this.graphicsLayer.removeAll();
      this.selectedDemands.forEach((el) =>
        this.addDemandToMap(el, this.changedMarkerSymbol),
      );
    }
    from(
      this.demandsService.getDemands(
        {
          pageIndex: 1,
          pageSize: 20000,
        },
        {
          status: 'confirmed',
          ...filters,
        },
      ),
    ).subscribe(
      (res) => {
        this.demands = res.list;
        this.demands.forEach((el) =>
          this.addDemandToMap(el, this.simpleMarkerSymbol),
        );
      },
      (err) => console.log('Error getting demands from server! ', err),
    );
  }

  addDemandToMap(req: Demand, sym: any): void {
    const pointToMap = new Point({
      latitude:
        req.beneficiary.latitude || 47.01820503506154 + Math.random() * 0.01,
      longitude:
        req.beneficiary.longitude || 28.812844986831664 + Math.random() * 0.01,
    });
    this.graphicsLayer.add(
      new Graphic({
        geometry: pointToMap,
        symbol: sym,
        attributes: {
          demandId: req._id,
          zone: req.beneficiary.zone ?? 'toate',
        },
      }),
    );
  }

  filterChanged(): void {
    let selectedZone = this.zones[0];
    let currentFilter = {};

    this.selectedCityZone = `${this.form.get('city_sector').value}`;
    this.selectedDemandTypeFilter = `${this.form.get('needs').value}`;

    if (
      this.selectedCityZone &&
      'toate'.normalize() !== this.selectedCityZone.normalize()
    ) {
      selectedZone = this.zones.find(
        (zone) =>
          zone.value.toLowerCase() === this.selectedCityZone.toLowerCase(),
      );
      this.mapView.center = new Point(selectedZone.mapCoordinates);
      currentFilter = { ...currentFilter, zone: selectedZone.value };
    }
    if (
      this.selectedDemandTypeFilter &&
      this.selectedDemandTypeFilter.normalize() !== this.anyDemand.normalize()
    ) {
      currentFilter = {
        ...currentFilter,
        type: this.selectedDemandTypeFilter,
      };
    }
    this.initializeDemandsOnTheMap('filter', currentFilter);
  }

  selectedVolunteerProvided(ev) {
    this.selectedVolunteer = ev;
  }

  nextFormStep(): void {
    if (this.stepOnSelectionZone === 3) {
      this.stepOnSelectionZone = 1;
      this.initializeDemandsOnTheMap('init');
    } else {
      this.stepOnSelectionZone++;
    }
    switch (this.stepOnSelectionZone) {
      case 1:
        this.buttonSelectorTextOnMap = 'Următor';
        this.headerSelection.nativeElement.innerHTML = 'Selectare Beneficiari';
        break;
      case 2:
        if (this.selectedDemands.length === 0) {
          this.stepOnSelectionZone--;
          this.snackMessage('Please select some demands');
          break;
        }
        this.buttonSelectorTextOnMap = 'Alocă';
        this.headerSelection.nativeElement.innerHTML = 'Selectare Voluntari';
        break;
      case 3:
        this.assignDemandsToVolunteer();
        this.buttonSelectorTextOnMap = 'Sarcină Nouă';
        this.headerSelection.nativeElement.innerHTML = 'FINISH!';
        break;
      default:
        this.buttonSelectorTextOnMap = 'ERROR !!!';
    }
  }

  onSubmit(ev): void {
    ev.preventDefault();
  }

  assignDemandsToVolunteer() {
    from(
      this.demandsService.assignToVolunteer(
        this.selectedDemands,
        this.selectedVolunteer._id,
      ),
    ).subscribe(
      () => {
        this.stepOnSelectionZone = 3;
      },
      (err) => {
        console.log('error', err.error);
      },
    );
  }

  snackMessage(msg: string) {
    this.snackBar.open(msg, '', {
      duration: 3000,
      panelClass: '', //additional CSS
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  ngOnDestroy() {
    this.mapView?.destroy();
    this.graphicsLayer = null;
  }
}
