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

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCzCovPositivityData(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);

// Download both sentinel and non-sentinel data files
await Promise.all([
    downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv"),
    downloadEuEcdcData("nonSentinelTestsDetections.csv")
]);

// Load both data sources
const sentinelData = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
const nonSentinelData = await loadAndParseCsv("nonSentinelTestsDetections.csv");

// Combine the data and process with survtype preserved
const combinedEuData = [...sentinelData, ...nonSentinelData];
let euPositivityData = computeEuEcdcData(combinedEuData, true); // true = preserve survtype

await saveData(euPositivityData, EU_ALLSENTINEL_ERVIS_POSITIVITY);

await downloadDeWastewaterData("amelag_aggregierte_kurve.tsv");
let tsvData = await loadAndParseTsv("amelag_aggregierte_kurve.tsv");
let deWastewaterData = computeDeWastewaterData(tsvData);

await saveData(deWastewaterData, DE_WASTEWATER_AMELAG);

await downloadNlInfectieradarData("data_pathogens.csv");
const nlCsvContent = await fs.readFile(getAbsolutePath("./data/data_pathogens.csv"), "utf-8");
let nlData = parseSemicolonCsv(nlCsvContent);
let nlPositivityData = computeNlInfectieradarData(nlData);

await saveData(nlPositivityData, NL_INFECTIERADAR_POSITIVITY);
await saveTimeStamp(TIMESTAMP_FILE);