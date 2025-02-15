import { loadAndParseCsv, saveData } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { CR_COV_MZCR_POSITIVITY, EU_ALLSENTINEL_ERVIS_POSITIVITY } from "./shared";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCzCovPositivityData(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);

await downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv");
data = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
let euPositivityData = computeEuEcdcData(data);

await saveData(euPositivityData, EU_ALLSENTINEL_ERVIS_POSITIVITY);
