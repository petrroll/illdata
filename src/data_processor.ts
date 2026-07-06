import { loadAndParseCsv, loadAndParseTsv, saveData } from "./data_sources/ioUtils";
import { computeCzCovPositivityData, downloadCzCovPositivity} from "./data_sources/cr_cov_mzcr";
import { computeEuEcdcData, downloadEuEcdcData } from "./data_sources/eu_all_ervis";
import { computeDeWastewaterData, downloadDeWastewaterData } from "./data_sources/de_wastewater_amelag";
import { computeDeAreData, downloadDeAreData } from "./data_sources/de_are";
import { computeNlInfectieradarData, downloadNlInfectieradarData, parseSemicolonCsv } from "./data_sources/nl_infectieradar";
import { promises as fs } from "fs";
import { getAbsolutePath } from "./data_sources/ioUtils";
import { computeMovingAverageTimeseries, type TimeseriesData } from "./utils";

// Output file paths for processed data
const CR_COV_MZCR_POSITIVITY = "./data_processed/cr_cov_mzcr/positivity_data.json";
const EU_ALLSENTINEL_ERVIS_POSITIVITY = "./data_processed/eu_sentinel_ervis/positivity_data.json";
const DE_WASTEWATER_AMELAG = "./data_processed/de_wastewater_amelag/wastewater_data.json";
const DE_ARE = "./data_processed/de_are/are_data.json";
const NL_INFECTIERADAR_POSITIVITY = "./data_processed/nl_infectieradar/positivity_data.json";
const TIMESTAMP_FILE = "./data_processed/timestamp.json";
const EMPTY_TIMESERIES: TimeseriesData = { dates: [], series: [] };
const AVERAGING_WINDOWS = [28];

export interface DataSourceStatus {
    name: string;
    status: "ok" | "failed";
    outputPath: string;
    error?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
    return fs.access(getAbsolutePath(filePath)).then(() => true).catch(() => false);
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function ensureOutputExists<TResult>(outputPath: string, fallbackResult: TResult): Promise<void> {
    if (await fileExists(outputPath)) {
        return;
    }

    await saveData(fallbackResult, outputPath);
}

export function addBuildTimeDerivedSeries(data: TimeseriesData): TimeseriesData {
    return computeMovingAverageTimeseries(data, AVERAGING_WINDOWS);
}

// Common pipeline: download → load → compute → save
export async function processSource<TInput, TResult>(
    name: string,
    downloadFn: (file: string) => Promise<void>,
    file: string,
    loaderFn: (file: string) => Promise<TInput>,
    computeFn: (data: TInput) => TResult,
    outputPath: string,
    fallbackResult: TResult
): Promise<DataSourceStatus> {
    try {
        await downloadFn(file);
        const data = await loaderFn(file);
        const result = computeFn(data);
        await saveData(result, outputPath);
        return { name, status: "ok", outputPath };
    } catch (error) {
        const message = formatError(error);
        console.warn(`Skipping ${name}: ${message}`);
        await ensureOutputExists(outputPath, fallbackResult);
        return { name, status: "failed", outputPath, error: message };
    }
}

async function processEuEcdcSource(): Promise<DataSourceStatus> {
    const name = "EU ECDC Respiratory Viruses";

    try {
        // EU ECDC: download both sentinel and non-sentinel, combine, then process
        await Promise.all([
            downloadEuEcdcData("sentinelTestsDetectionsPositivity.csv"),
            downloadEuEcdcData("nonSentinelTestsDetections.csv")
        ]);
        const sentinelData = await loadAndParseCsv("sentinelTestsDetectionsPositivity.csv");
        const nonSentinelData = await loadAndParseCsv("nonSentinelTestsDetections.csv");
        const combinedEuData = [...sentinelData, ...nonSentinelData];
        await saveData(addBuildTimeDerivedSeries(computeEuEcdcData(combinedEuData, true)), EU_ALLSENTINEL_ERVIS_POSITIVITY);
        return { name, status: "ok", outputPath: EU_ALLSENTINEL_ERVIS_POSITIVITY };
    } catch (error) {
        const message = formatError(error);
        console.warn(`Skipping ${name}: ${message}`);
        await ensureOutputExists(EU_ALLSENTINEL_ERVIS_POSITIVITY, EMPTY_TIMESERIES);
        return { name, status: "failed", outputPath: EU_ALLSENTINEL_ERVIS_POSITIVITY, error: message };
    }
}

export async function runDataProcessor() {
    const sourceStatuses: DataSourceStatus[] = [];

   sourceStatuses.push(await processSource("Czech MZCR COVID positivity", downloadCzCovPositivity, "testy-pcr-antigenni.csv", loadAndParseCsv, data => addBuildTimeDerivedSeries(computeCzCovPositivityData(data)), CR_COV_MZCR_POSITIVITY, EMPTY_TIMESERIES));
    sourceStatuses.push(await processEuEcdcSource());
    sourceStatuses.push(await processSource("Germany Wastewater Surveillance (AMELAG)", downloadDeWastewaterData, "amelag_aggregierte_kurve.tsv", loadAndParseTsv, data => addBuildTimeDerivedSeries(computeDeWastewaterData(data)), DE_WASTEWATER_AMELAG, EMPTY_TIMESERIES));
    sourceStatuses.push(await processSource("Germany SARI Hospitalization Incidence", downloadDeAreData, "SARI-Hospitalisierungsinzidenz.tsv", loadAndParseTsv, data => addBuildTimeDerivedSeries(computeDeAreData(data)), DE_ARE, EMPTY_TIMESERIES));
    sourceStatuses.push(await processSource(
        "Netherlands Infectieradar Pathogens",
        downloadNlInfectieradarData,
        "data_pathogens.csv",
        async (file) => {
            const content = await fs.readFile(getAbsolutePath(`./data/${file}`), "utf-8");
            return parseSemicolonCsv(content);
        },
        data => addBuildTimeDerivedSeries(computeNlInfectieradarData(data)),
        NL_INFECTIERADAR_POSITIVITY,
        EMPTY_TIMESERIES
    ));

    await saveData({
        timestamp: new Date().toISOString(),
        sources: sourceStatuses
    }, TIMESTAMP_FILE);
}

if (import.meta.main) {
    await runDataProcessor();
}
