import { loadAndParseCsv, saveData, saveTimeStamp } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { CR_COV_MZCR_POSITIVITY, EU_ALLSENTINEL_ERVIS_POSITIVITY, DE_ARE_RKI, TIMESTAMP_FILE } from "./shared";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";
import { computeDeAreData, downloadDeAreData, loadAndParseTsv } from "./data_sources/de_are_rki";

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCzCovPositivityData(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);

await downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv");
data = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
let euPositivityData = computeEuEcdcData(data);

await saveData(euPositivityData, EU_ALLSENTINEL_ERVIS_POSITIVITY);

await downloadDeAreData("ARE-Konsultationsinzidenz.tsv");
let tsvData = await loadAndParseTsv("ARE-Konsultationsinzidenz.tsv");
let deAreData = computeDeAreData(tsvData);

await saveData(deAreData, DE_ARE_RKI);
await saveTimeStamp(TIMESTAMP_FILE);