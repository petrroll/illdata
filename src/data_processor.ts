import { saveData, toFloat } from "./data_sources/utils";
import { downloadCzCovPositivity, loadAndParseCsv} from "./data_sources/cr_cov_mzcr";
import { CR_COV_MZCR_POSITIVITY, type MzcrCovidTestPositivity } from "./shared";


function getLastTenElements<T>(data: T[]): T[] {
    return data.slice(-10);
}

function computeCovPositivity(data: Record<string, string>[]): MzcrCovidTestPositivity[] {
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

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCovPositivity(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);
export { CR_COV_MZCR_POSITIVITY };

