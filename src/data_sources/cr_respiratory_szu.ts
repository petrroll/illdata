import { getAbsolutePath, normalizeDate, toFloat, saveData } from "./ioUtils";
import type { TimeseriesData, PositivitySeries } from "../utils";
import { promises as fs } from "fs";

/**
 * Czech respiratory virus data from SZU (State Health Institute)
 * Source: https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/
 * 
 * The data contains weekly virus detection results from the national surveillance system.
 * Data is published weekly in PDF format with tables showing virus types and detection counts.
 */

export interface VirusWeekData {
    week: string;          // Calendar week (KT) in format "YYYY-WW"
    date: string;          // ISO date (YYYY-MM-DD) - Monday of the week
    influenzaA: number;    // Number of Influenza A detections
    influenzaB: number;    // Number of Influenza B detections
    rsv: number;           // RSV (Respiratory Syncytial Virus) detections
    adenovirus: number;    // Adenovirus detections
    rhinovirus: number;    // Rhinovirus detections
    parainfluenza: number; // Parainfluenza detections
    coronavirus: number;   // Coronavirus (non-SARS-CoV-2) detections
    totalTests: number;    // Total number of tests performed
}

/**
 * Parse ISO week string (e.g., "2025-W01") and convert to ISO date (Monday of that week)
 */
export function weekToDate(isoWeek: string): string {
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid ISO week format: ${isoWeek}`);
    }
    
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);
    
    // ISO week 1 is the week with the year's first Thursday
    // Calculate the date of the Monday of that week
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // Sunday = 7
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - jan4Day + 1);
    
    // Add weeks
    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    return targetDate.toISOString().split('T')[0];
}

/**
 * Convert Czech calendar week format (e.g., "1.KT 2026") to ISO week format
 */
export function czechWeekToIsoWeek(czechWeek: string): string {
    const match = czechWeek.match(/^(\d+)\.KT\s+(\d{4})$/);
    if (!match) {
        throw new Error(`Invalid Czech week format: ${czechWeek}`);
    }
    
    const week = parseInt(match[1]);
    const year = parseInt(match[2]);
    
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Load and parse manually prepared CSV data for SZU respiratory viruses.
 * 
 * CSV format:
 * week,influenzaA,influenzaB,rsv,adenovirus,rhinovirus,parainfluenza,coronavirus,totalTests
 * 2025-W40,15,3,45,12,23,8,5,250
 * 
 * Note: Until we have automated PDF parsing, this data needs to be manually extracted
 * from the weekly PDFs published at https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/
 */
export async function loadSzuRespiratoryData(filename: string = "szu_respiratory.csv"): Promise<VirusWeekData[]> {
    const filepath = getAbsolutePath(`./data/${filename}`);
    
    try {
        const csvContent = await fs.readFile(filepath, "utf-8");
        const lines = csvContent.split("\n").filter(line => line.trim() !== "");
        
        // Skip header
        const dataLines = lines.slice(1);
        
        return dataLines.map(line => {
            const parts = line.split(",").map(p => p.trim());
            const week = parts[0];
            
            return {
                week,
                date: weekToDate(week),
                influenzaA: parseInt(parts[1]) || 0,
                influenzaB: parseInt(parts[2]) || 0,
                rsv: parseInt(parts[3]) || 0,
                adenovirus: parseInt(parts[4]) || 0,
                rhinovirus: parseInt(parts[5]) || 0,
                parainfluenza: parseInt(parts[6]) || 0,
                coronavirus: parseInt(parts[7]) || 0,
                totalTests: parseInt(parts[8]) || 0,
            };
        });
    } catch (error) {
        console.log(`Note: ${filename} not found. Using empty dataset.`);
        console.log("To add data, create ./data/szu_respiratory.csv with weekly virus detection data.");
        return [];
    }
}

/**
 * Compute time series data from SZU respiratory virus data
 */
export function computeSzuRespiratoryData(rawData: VirusWeekData[]): TimeseriesData {
    if (rawData.length === 0) {
        return {
            dates: [],
            series: []
        };
    }
    
    const dates = rawData.map(row => row.date);
    
    // Create series for each virus type
    const series: PositivitySeries[] = [
        {
            name: "Influenza A",
            values: rawData.map(row => ({
                positive: row.influenzaA,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Influenza B",
            values: rawData.map(row => ({
                positive: row.influenzaB,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "RSV",
            values: rawData.map(row => ({
                positive: row.rsv,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Adenovirus",
            values: rawData.map(row => ({
                positive: row.adenovirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Rhinovirus",
            values: rawData.map(row => ({
                positive: row.rhinovirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Parainfluenza",
            values: rawData.map(row => ({
                positive: row.parainfluenza,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        },
        {
            name: "Coronavirus (non-CoV-2)",
            values: rawData.map(row => ({
                positive: row.coronavirus,
                tests: row.totalTests
            })),
            type: 'raw',
            frequencyInDays: 7,
            dataType: 'positivity'
        }
    ];
    
    return {
        dates,
        series
    };
}
