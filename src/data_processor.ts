import { loadAndParseCsv, loadAndParseTsv, saveData, saveTimeStamp } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";
import { computeDeWastewaterData, downloadDeWastewaterData } from "./data_sources/de_wastewater_amelag";
import { computeNlInfectieradarData, downloadNlInfectieradarData, parseSemicolonCsv } from "./data_sources/nl_infectieradar";
import { promises as fs } from "fs";
import { getAbsolutePath } from "./data_sources/ioUtils";

// Output file paths for processed data
const CR_COV_MZCR_POSITIVITY = "./data_processed/cr_cov_mzcr/positivity_data.json";
const EU_ALLSENTINEL_ERVIS_POSITIVITY = "./data_processed/eu_sentinel_ervis/positivity_data.json";
const DE_WASTEWATER_AMELAG = "./data_processed/de_wastewater_amelag/wastewater_data.json";
const NL_INFECTIERADAR_POSITIVITY = "./data_processed/nl_infectieradar/positivity_data.json";
const TIMESTAMP_FILE = "./data_processed/timestamp.json";

// Common pipeline: download → load → compute → save
async function processSource(
    downloadFn: (file: string) => Promise<void>,
    file: string,
    loaderFn: (file: string) => Promise<Record<string, string>[]>,
    computeFn: (data: Record<string, string>[]) => unknown,
    outputPath: string
) {
    await downloadFn(file);
    const data = await loaderFn(file);
    const result = computeFn(data);
    await saveData(result, outputPath);
}

await processSource(downloadCzCovPositivity, "testy-pcr-antigenni.csv", loadAndParseCsv, computeCzCovPositivityData, CR_COV_MZCR_POSITIVITY);

// EU ECDC: download both sentinel and non-sentinel, combine, then process
await Promise.all([
    downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv"),
    downloadEuEcdcData("nonSentinelTestsDetections.csv")
]);
const sentinelData = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
const nonSentinelData = await loadAndParseCsv("nonSentinelTestsDetections.csv");
const combinedEuData = [...sentinelData, ...nonSentinelData];
await saveData(computeEuEcdcData(combinedEuData, true), EU_ALLSENTINEL_ERVIS_POSITIVITY);

await processSource(downloadDeWastewaterData, "amelag_aggregierte_kurve.tsv", loadAndParseTsv, computeDeWastewaterData, DE_WASTEWATER_AMELAG);

// NL Infectieradar: uses custom semicolon CSV parser
await downloadNlInfectieradarData("data_pathogens.csv");
const nlCsvContent = await fs.readFile(getAbsolutePath("./data/data_pathogens.csv"), "utf-8");
await saveData(computeNlInfectieradarData(parseSemicolonCsv(nlCsvContent)), NL_INFECTIERADAR_POSITIVITY);

await saveTimeStamp(TIMESTAMP_FILE);