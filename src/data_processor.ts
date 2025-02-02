import { toFloat } from "./utils";
import { downloadCzkCovidCsv, loadAndParseCsv} from "./data_sources/mzcr";
import { promises as fs } from "fs";
import type { MzcrCovidTestPositivity } from "./data_types";

function getLastTenElements<T>(data: T[]): T[] {
    return data.slice(-10);
}

function computeTestPositivity(data: Record<string, string>[]): MzcrCovidTestPositivity[] {
    return data.map(row => {
        const datum = row["datum"] || row["Datum"] || "";

        const pcrTotal = toFloat(row, "pocet_PCR_testy");
        const antigenTotal = toFloat(row, "pocet_AG_testy");

        const antigenPos = toFloat(row, "AG_pozit_symp") + toFloat(row, "AG_pozit_asymp_PCR_conf");
        const pcrPos = toFloat(row, "PCR_pozit_sympt") + toFloat(row, "PCR_pozit_asymp");

        const pcrRate = pcrTotal ? (pcrPos / pcrTotal) * 100 : 0;
        const antigenRate = antigenTotal ? (antigenPos / antigenTotal) * 100 : 0;
        return { datum, pcrPositivity: pcrRate, antigenPositivity: antigenRate };
    });
}

async function savePositivityData(data: MzcrCovidTestPositivity[]): Promise<void> {
    const dir = "./data_processed/covid_mzcr";
    await fs.mkdir(dir, { recursive: true });
    const filePath = `${dir}/positivity_data.json`;
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Positivity data saved to ${filePath}`);
}

await downloadCzkCovidCsv("zakladni-prehled.csv", true)
await downloadCzkCovidCsv("testy-pcr-antigenni.csv")

let data = await loadAndParseCsv("testy-pcr-antigenni.csv");

let positivityData = computeTestPositivity(data);
await savePositivityData(positivityData);

console.log("Hello via Bun!");