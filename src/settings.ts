"use strict";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export class VisualSettings extends DataViewObjectsParser {
  public table: TableSettings = new TableSettings();
}

export class TableSettings {
  public tableColor: string = "white";
  public tableThickness: number = 2;
  public cellFontSize: number = 18;
}