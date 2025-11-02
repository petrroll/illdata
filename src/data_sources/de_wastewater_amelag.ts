import { getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";
import { promises as fs } from "fs";
import path from "path";

export async function downloadDeWastewaterData(filename: string = "amelag_aggregierte_kurve.tsv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.access(filePath).then(() => true).catch(() => false)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/robert-koch-institut/Abwassersurveillance_AMELAG/main/${filename}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch TSV: ${response.statusText}`);
    const tsvContent = await response.text();
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, tsvContent, "utf-8");
    console.log(`TSV downloaded and saved to ${filePath}`);
}

export function computeDeWastewaterData(data: Record<string, string>[]): TimeseriesData {
    // The data is tab-separated with columns:
    // datum, n, anteil_bev, viruslast, viruslast_normalisiert, vorhersage, obere_schranke, untere_schranke, typ
    
    // Group by date and virus type (typ)
    const groupedData = new Map<string, Map<string, { viruslast_normalisiert: number, count: number }>>();
    
    data.forEach(row => {
        const datum = normalizeDate(row["datum"] || "");
        const virusType = row["typ"] || "";
        const viruslast = toFloat(row, "viruslast_normalisiert");
        
        if (!datum || !virusType || isNaN(viruslast)) {
            return;
        }
        
        if (!groupedData.has(datum)) {
            groupedData.set(datum, new Map());
        }
        const dateGroup = groupedData.get(datum)!;
        
        if (!dateGroup.has(virusType)) {
            dateGroup.set(virusType, { viruslast_normalisiert: viruslast, count: 1 });
        } else {
            // If there are multiple entries for the same date and virus, take the most recent one
            dateGroup.set(virusType, { viruslast_normalisiert: viruslast, count: 1 });
        }
    });

    // Get unique dates and virus types
    const dates = [...groupedData.keys()].sort();
    const virusTypes = [...new Set(data.map(row => row["typ"]))].filter(Boolean);

    // Normalize virus type names to aggregate at the virus level (not subtypes)
    const normalizeVirusName = (name: string): string => {
        // Aggregate all Influenza subtypes into one
        if (name.includes("Influenza")) return "Influenza";
        
        // Aggregate all RSV subtypes into one
        if (name.includes("RSV")) return "RSV";
        
        // Keep SARS-CoV-2 as is
        return name;
    };

    // Group virus types by normalized name
    const normalizedVirusTypes = [...new Set(virusTypes.map(normalizeVirusName))];

    // Create series for each normalized virus type
    return {
        dates,
        series: normalizedVirusTypes.map(normalizedType => {
            // Find all original types that map to this normalized type
            const originalTypes = virusTypes.filter(t => normalizeVirusName(t) === normalizedType);
            
            return {
                name: `${normalizedType} Wastewater`,
                values: dates.map(date => {
                    // Sum up values from all matching original types for this date
                    let totalViruslast = 0;
                    let hasData = false;
                    
                    originalTypes.forEach(originalType => {
                        const stats = groupedData.get(date)?.get(originalType);
                        if (stats) {
                            totalViruslast += stats.viruslast_normalisiert;
                            hasData = true;
                        }
                    });
                    
                    // Return as scalar datapoint with virus load value
                    return {
                        virusLoad: hasData ? totalViruslast : 0
                    };
                }),
                type: 'raw',
                frequencyInDays: 7,  // Weekly data
                dataType: 'scalar'
            };
        })
    };
}
