import powerbi from "powerbi-visuals-api";

import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;

export interface TableDataPoint {
    xCoordinate: PrimitiveValue,
    yCoordinate: PrimitiveValue,
    values: any[],
    color: string,
    selectionId: ISelectionId;
}