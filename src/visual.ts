"use strict";

import powerbi from "powerbi-visuals-api";
import "regenerator-runtime/runtime";
import {createTooltipServiceWrapper, ITooltipServiceWrapper, TooltipEventArgs} from "powerbi-visuals-utils-tooltiputils";

import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

import { VisualSettings } from "./settings";

export class Visual implements IVisual {
    private host: IVisualHost;
    private settings: VisualSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private container: Selection<HTMLElement>;
    private table: Selection<HTMLElement>;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        this.container = d3.select(options.element)
                        .append('div')
                        .style('width', '100%')
                        .style('height', '100%');
                        
        this.table = this.container.append("table");
    }

    public update(options: VisualUpdateOptions) {
        if(options.dataViews 
            && options.dataViews[0]
            && options.dataViews[0].table
            && options.dataViews[0].table.rows){
            const dataView: DataView = options.dataViews[0];

            this.table.style('height', '100%')
                    .style('width', '100%');

            this.generateReactMatrix(dataView);

            this.tooltipServiceWrapper.addTooltip(this.table.selectAll(),
                (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<number>) => null
            );
        }
    }

    generateReactMatrix(dataView: DataView): void {
        const data = dataView.table.rows;

        this.settings = Visual.parseSettings(dataView);
        const graphicalSettings = this.settings.table;

        const rowsNumber = this.getMax(data, 0) + 1;
        const colsNumber = this.getMax(data, 1) + 1;
        
        this.table.html("");

        for (let x = 0; x < rowsNumber; x++) {
            let tableColsContent: Selection<HTMLElement> = this.table.append('tr');

            for (let y = 0; y < colsNumber; y++) {
                if(y == 0 && x == 0) {
                    tableColsContent.append('td');
                    continue;
                }

                if(y != 0 && x != 0) {
                    tableColsContent.append('td')
                                    .style('border', graphicalSettings.tableThickness + 'px solid')
                                    .style('text-align', 'center')
                                    .style('font-size', graphicalSettings.cellFontSize + 'px')
                                    .text(this.searchElementValue(data, x, y));
                }else if(y == 0) {
                    tableColsContent.append('td')
                                    .style('text-align', 'right')
                                    .style('font-size', graphicalSettings.cellFontSize + 'px')
                                    .text(x);
                } else if(x == 0) {
                    tableColsContent.append('td')
                                    .style('vertical-align', 'bottom')
                                    .style('text-align', 'center')
                                    .style('font-size', graphicalSettings.cellFontSize + 'px')
                                    .text(y);
                }
            }
        }
    }

    private getTooltipData(value: any): VisualTooltipDataItem[] {
        return [{
            displayName: value.category,
            value: value.value.toString(),
            color: value.color,
            header: "Titolo"
        }];
    }

    searchElementValue(data: any[], x: number, y: number): any {
        const result = data.filter(element => element[0] == x && element[1] == y);

        if(result && result[0]) {
            return result[0][2];
        }

        return [];
    }

    getMax(array: any[], indexInnerElement: number): number {
        let max = 0;

        for (let index = 0; index < array.length; index++) {
            if(array[index][indexInnerElement] > max) {
                max = array[index][indexInnerElement];
            }
        }

        return max;
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}