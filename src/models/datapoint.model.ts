import powerbi from "powerbi-visuals-api";

import ISelectionId = powerbi.visuals.ISelectionId;

export interface TableDataPoint {
    xCoordinate: number,
    yCoordinate: number,
    value: any,
    selectionId: ISelectionId;
}