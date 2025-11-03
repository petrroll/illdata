export const CR_COV_MZCR_POSITIVITY = "./data_processed/cr_cov_mzcr/positivity_data.json";
export const EU_ALLSENTINEL_ERVIS_POSITIVITY = "./data_processed/eu_sentinel_ervis/positivity_data.json";
export const DE_WASTEWATER_AMELAG = "./data_processed/de_wastewater_amelag/wastewater_data.json";
export const TIMESTAMP_FILE = "./data_processed/timestamp.json";
export interface MzcrCovidTestPositivity {
    datum: string;
    pcrPositivity: number;
    antigenPositivity: number;
}
