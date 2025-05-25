import { downloadAndSaveCsv, downloadCsv, getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";

export function computeCzCovPositivityData(data: Record<string, string>[]): TimeseriesData {
    const processedData = data.map(row => {
        const datum = normalizeDate(row["datum"] || row["Datum"] || "");

        let pcr = getPositivity("pocet_PCR_testy", ["PCR_pozit_sympt", "PCR_pozit_asymp"]);
        let ag = getPositivity("pocet_AG_testy", ["AG_pozit_symp", "AG_pozit_asymp_PCR_conf"]);
        return { datum, pcr, ag };

        function getPositivity(totalColumn: string ,positiveColumns: string[]) {
            var total = toFloat(row, totalColumn);
            var positives = positiveColumns.map(col => toFloat(row, col)).reduce((a, b) => a + b, 0);

            if (positives > 0 && total === 0) {
                console.log(`Warning: PCR positivity is greater than zero ${positives} but total PCR tests are zero on date ${datum}. This may indicate an issue with the data.`);
                positives = 0; // Reset to zero to avoid misleading positivity rate
            }
            return { positive: positives, tests: total };
        }
    });

    return {
        dates: processedData.map(row => row.datum),
        series: [
            {
                name: "PCR Positivity",
                values: processedData.map(row => row.pcr),
                type: 'raw',
                frequencyInDays: 1
            },
            {
                name: "Antigen Positivity",
                values: processedData.map(row => row.ag),
                type: 'raw',
                frequencyInDays: 1,
            }
        ]
    };
}

export async function downloadCzCovPositivity(filename: string, perDay: boolean = false) {
    let storedFilename = filename;
    if (perDay) {
        storedFilename = createPerDayName(filename, storedFilename);
    }
    const filePath = getAbsolutePath(`./data/${storedFilename}`);
    const url = `https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/${filename}`;

    await downloadAndSaveCsv(url, filePath);
}

function createPerDayName(filename: string, storedFilename: string) {
    // Use current date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);
    const dotIndex = filename.lastIndexOf('.');
    storedFilename = dotIndex !== -1
        ? `${filename.slice(0, dotIndex)}_${today}${filename.slice(dotIndex)}`
        : `${filename}_${today}`;
    return storedFilename;
}

