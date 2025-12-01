import { loadAndParseCsv, loadAndParseTsv, saveData, saveTimeStamp } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";
import { computeDeWastewaterData, downloadDeWastewaterData } from "./data_sources/de_wastewater_amelag";

// Output file paths for processed data
const CR_COV_MZCR_POSITIVITY = "./data_processed/cr_cov_mzcr/positivity_data.json";
const EU_ALLSENTINEL_ERVIS_POSITIVITY = "./data_processed/eu_sentinel_ervis/positivity_data.json";
const DE_WASTEWATER_AMELAG = "./data_processed/de_wastewater_amelag/wastewater_data.json";
const TIMESTAMP_FILE = "./data_processed/timestamp.json";

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCzCovPositivityData(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);

await downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv");
data = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
let euPositivityData = computeEuEcdcData(data);

await saveData(euPositivityData, EU_ALLSENTINEL_ERVIS_POSITIVITY);

await downloadDeWastewaterData("amelag_aggregierte_kurve.tsv");
let tsvData = await loadAndParseTsv("amelag_aggregierte_kurve.tsv");
let deWastewaterData = computeDeWastewaterData(tsvData);

await saveData(deWastewaterData, DE_WASTEWATER_AMELAG);
await saveTimeStamp(TIMESTAMP_FILE);