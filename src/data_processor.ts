import { loadAndParseCsv, saveData } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { CR_COV_MZCR_POSITIVITY } from "./shared";

await downloadCzCovPositivity("testy-pcr-antigenni.csv")
let data = await loadAndParseCsv("testy-pcr-antigenni.csv");
let positivityData = computeCzCovPositivityData(data);

await saveData(positivityData, CR_COV_MZCR_POSITIVITY);

