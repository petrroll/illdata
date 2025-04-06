import { downloadAndSaveCsv, downloadCsv, getAbsolutePath, normalizeDate, toFloat } from "./ioUtils";
import type { TimeseriesData } from "../utils";

export function computeCzCovPositivityData(data: Record<string, string>[]): TimeseriesData {
    const processedData = data.map(row => {
        const datum = normalizeDate(row["datum"] || row["Datum"] || "");

        const pcrTotal = toFloat(row, "pocet_PCR_testy");
        const antigenTotal = toFloat(row, "pocet_AG_testy");

        const antigenPos = toFloat(row, "AG_pozit_symp") + toFloat(row, "AG_pozit_asymp_PCR_conf");
        const pcrPos = toFloat(row, "PCR_pozit_sympt") + toFloat(row, "PCR_pozit_asymp");

        const pcrRate = pcrTotal ? (pcrPos / pcrTotal) * 100 : 0;
        const antigenRate = antigenTotal ? (antigenPos / antigenTotal) * 100 : 0;
        return { datum, pcrRate, antigenRate };
    });

    return {
        dates: processedData.map(row => row.datum),
        series: [
            {
                name: "PCR Positivity",
                values: processedData.map(row => row.pcrRate),
                type: 'raw'
            },
            {
                name: "Antigen Positivity",
                values: processedData.map(row => row.antigenRate),
                type: 'raw'
            }
        ],
        frequencyInDays: 1   
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

