"use strict";

import "regenerator-runtime/runtime";
import powerbi from "powerbi-visuals-api";
import {createTooltipServiceWrapper, ITooltipServiceWrapper, TooltipEventArgs} from "powerbi-visuals-utils-tooltiputils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IColorPalette = powerbi.extensibility.IColorPalette;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import PrimitiveValue = powerbi.PrimitiveValue;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

import { TableDataPoint } from './models/datapoint.model';
import { VisualSettings } from "./settings";

import "./../style/visual.less";

export class Visual implements IVisual {
    private host: IVisualHost;
    private settings: VisualSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private selectionManager: ISelectionManager;

    private dataViewTableRowItems: TableDataPoint[];
    private tableDataPoints: TableDataPoint[];

    private container: Selection<HTMLElement>;
    private table: Selection<HTMLElement>;

    /// Method used to initialize the custom visual
    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.host.createSelectionManager();
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        this.selectionManager = this.host.createSelectionManager();

        this.container = d3.select(options.element)
                        .append('div')
                        .style('width', '100%')
                        .style('height', '100%');
                        
        this.table = this.container.append("table");
    }

    /// Method used to parse the raw data from the user to a more complex structured data
    private parseDataViewItems(dataToParse: DataView, colorPalette: IColorPalette): void {
        dataToParse.table.rows.forEach((row: powerbi.DataViewTableRow, rowIndex: number) => {
            const tableValues: any[] = [];
            let category: any = null;

            for (let valueIndex = row.length == 3 ? 2 : 3; valueIndex < row.length; valueIndex++) {
                tableValues.push(row[valueIndex]);

                if(row.length != 3) {
                    category = row[2];
                }
            }

            const selection: ISelectionId = this.host.createSelectionIdBuilder()
                                                .withTable(dataToParse.table, rowIndex)
                                                .createSelectionId();           

            const parsedItem: TableDataPoint = {
                xCoordinate: row[0],
                yCoordinate: row[1],
                values: tableValues,
                color: category ? colorPalette.getColor(<string>row[2]).value : null,
                selectionId: selection
            }          

            console.log(row);
            console.log(parsedItem);

            this.dataViewTableRowItems.push(parsedItem);   
        });
    }

    /// Method used to listen to every update of the visual
    public update(options: VisualUpdateOptions): void {
        if(options.dataViews 
            && options.dataViews[0]
            && options.dataViews[0].table
            && options.dataViews[0].table.rows) {
            const dataView: DataView = options.dataViews[0];
            this.settings = Visual.parseSettings(dataView);

            let colorPalette: IColorPalette = this.host.colorPalette;
        
            this.dataViewTableRowItems = [];
            this.parseDataViewItems(dataView, colorPalette);

            this.table.style('height', '100%')
                    .style('width', '100%');

            this.generateReactMatrix();

            let barSelection = this.container
                                .selectAll('.tableDataCell');

            barSelection = this.container.selectAll('.emptyTableDataCell')
                                        .data(this.tableDataPoints);

            const barSelectionMerged = barSelection.enter()
                                        .append('rect')
                                        .merge(<any>barSelection);
                                            
            this.tooltipServiceWrapper.addTooltip(barSelectionMerged,
                (tooltipData: TableDataPoint) => this.getTooltipData(tooltipData),
                (tooltipData: TableDataPoint) => tooltipData.selectionId
            );
        } else {
            this.clean();
        }
    }

    /// Method used to render the matrix and to give the container extra CSS properties
    generateReactMatrix(): void {
        const graphicalSettings = this.settings.table;

        this.container.style('background-color', graphicalSettings.tableColor);

        const rowsNumber = <number>(this.getMaxRows()) + 1;
        
        const colsNumber = <number>(this.getMaxCols()) + 1;
        
        this.table.html("");
        this.tableDataPoints = [];

        for (let x = 0; x < rowsNumber; x++) {
            let tableColsContent: Selection<HTMLElement> = this.table.append('tr');

            for (let y = 0; y < colsNumber; y++) {
                if(y == 0 && x == 0) {
                    tableColsContent.append('td');
                    continue;
                }

                if(y != 0 && x != 0) {
                    const value = this.searchElementValue(x, y);
                    
                    let cell = tableColsContent.append('td')
                                    .style('border', graphicalSettings.tableThickness + 'px solid')
                                    .style('font-size', graphicalSettings.cellFontSize + 'px');

                    cell.on("click", () => {
                        this.selectionManager.select(value.selectionId);
                    });

                    cell.on("contextmenu", (event) => {
                        this.selectionManager.showContextMenu(value.selectionId, {
                            x: event.clientX,
                            y: event.clientY
                        });            

                        event.preventDefault();
                    });

                    if(value != null) {
                        cell.classed('emptyTableDataCell', true);

                        if(value.color) {
                            let container = cell.append("div")
                                                .style('width', '100%')
                                                .style("height", "100%");

                            let indicator = container.append("div")
                                                    .style('width', '50%')
                                                    .style("float", "left")
                                                    .style("height", "100%")
                                                    .style('background-color', value.color);

                            let data = container.append("div")
                                                .style('margin-left', '50%')
                                                .style("height", "100%")
                                                .style('vertical-align', 'center')
                                                .classed('centerDIV', true)
                                                .text(value.values.join());
                        } else {
                            cell.append("div")
                                .style('width', '100%')
                                .style("height", "100%")
                                .style('vertical-align', 'center')
                                .classed('centerDIV', true)
                                .text(value.values.join());
                        }

                        const model: TableDataPoint = {
                            xCoordinate: x,
                            yCoordinate: y,
                            color: value.color,
                            values: value.values,
                            selectionId: value.selectionId
                        };

                        this.tableDataPoints.push(model);
                    }
                } else if(y == 0) {
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

    /// Method to convert and provide data for the default tooltip
    private getTooltipData(value: TableDataPoint): VisualTooltipDataItem[] {
        return [{
            header: "Cella: " + value.xCoordinate + ", " + value.yCoordinate,
            displayName: "Valore: ",
            value: value.values.join()
        }];
    }

    /// Method to search the values into the provided array with the provided (x,y) position
    searchElementValue(x: number, y: number): TableDataPoint {
        const result = this.dataViewTableRowItems.filter(element => element.xCoordinate == x && element.yCoordinate == y);

        if(result && result[0]) {
            return result[0];
        }

        return null;
    }

    /// Get max row values from the provided array
    getMaxRows(): PrimitiveValue {
        let max: PrimitiveValue = 0;

        for (let index = 0; index < this.dataViewTableRowItems.length; index++) {
            if(this.dataViewTableRowItems[index].xCoordinate > max) {
                max = this.dataViewTableRowItems[index].xCoordinate;
            }
        }

        return max;
    }

    /// Get max column values from the provided array
    getMaxCols(): PrimitiveValue {
        let max: PrimitiveValue = 0;

        for (let index = 0; index < this.dataViewTableRowItems.length; index++) {
            if(this.dataViewTableRowItems[index].yCoordinate > max) {
                max = this.dataViewTableRowItems[index].yCoordinate;
            }
        }

        return max;
    }

    /// Method used to reset the view to its default settings
    private clean() {
        this.table.html("");
        this.tableDataPoints = [];
        this.dataViewTableRowItems = [];
    }

    /// Settings Parsing Method
    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /// Method to react to the settings' changes
    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}