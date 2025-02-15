import { promises as fs } from "fs";
import { downloadAndSaveCsv, getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";

export async function downloadEuEcdcData(filename: string = "nonSentinelTestsDetections.csv") {
    const filePath = getAbsolutePath(`./data/${filename}`);

    if (await fs.exists(filePath)) {
        console.log(`File already exists at ${filePath}`);
        return;
    }

    const url = `https://raw.githubusercontent.com/EU-ECDC/Respiratory_viruses_weekly_data/main/data/${filename}`;
    await downloadAndSaveCsv(url, filePath);
}

export function computeEuEcdcData(data: Record<string, string>[]): TimeseriesData {
    const processedData = data.map(row => {
        const datum = normalizeDate(row["year_week"]); // Assuming the date format needs to be normalized
        const testsTotal = toFloat(row, "number_testing");
        const positiveCases = toFloat(row, "number_detections");
        const positivityRate = testsTotal ? (positiveCases / testsTotal) * 100 : 0;

        return {
            datum,
            positivityRate,
            virus: row["virus"],
            country: row["country"]
        };
    });

    // Group by virus type
    const virusTypes = [...new Set(processedData.map(row => row.virus))];

    return {
        dates: [...new Set(processedData.map(row => row.datum))].sort(),
        series: virusTypes.map(virus => ({
            name: `${virus} Positivity`,
            values: processedData
                .filter(row => row.virus === virus)
                .sort((a, b) => a.datum.localeCompare(b.datum))
                .map(row => row.positivityRate),
            type: 'raw'
        }))
    };
}