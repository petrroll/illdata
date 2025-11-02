import { loadAndParseCsv, loadAndParseTsv, saveData, saveTimeStamp } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { CR_COV_MZCR_POSITIVITY, EU_ALLSENTINEL_ERVIS_POSITIVITY, DE_WASTEWATER_AMELAG, TIMESTAMP_FILE } from "./shared";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";
import { computeDeWastewaterData, downloadDeWastewaterData } from "./data_sources/de_wastewater_amelag";

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