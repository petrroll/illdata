export const CR_COV_MZCR_POSITIVITY = "./data_processed/cr_cov_mzcr/positivity_data.json";

export interface MzcrCovidTestPositivity {
    datum: string;
    pcrPositivity: number;
    antigenPositivity: number;
    type: 'raw' | 'averaged';
    windowsize?: number;
}
