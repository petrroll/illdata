import { toFloat } from "./utils";
import { downloadCzkCovidCsv, loadAndParseCsv} from "./data_sources/mz_cr";

function getLastTenElements<T>(data: T[]): T[] {
    return data.slice(-10);
}

function computeTestPositivity(data: Record<string, string>[]): { datum: string, pcrPositivity: number, antigenPositivity: number }[] {
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

await downloadCzkCovidCsv("zakladni-prehled.csv", true)
await downloadCzkCovidCsv("testy-pcr-antigenni.csv")

let data = await loadAndParseCsv("testy-pcr-antigenni.csv");

let positivityData = getLastTenElements(computeTestPositivity(data));
console.log("Test positivity per day:", positivityData);

console.log("Hello via Bun!");