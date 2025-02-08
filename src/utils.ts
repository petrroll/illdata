export interface TimeseriesData {
    dates: string[];
    series: {
        name: string;
        values: number[];
    }[];
}

export function transformMzcrDataToTimeseries(data: { datum: string; pcrPositivity: number; antigenPositivity: number }[]): TimeseriesData {
    const dates = data.map(item => item.datum);
    const pcrValues = data.map(item => item.pcrPositivity);
    const antigenValues = data.map(item => item.antigenPositivity);

    return {
        dates: dates,
        series: [
            {
                name: "PCR Positivity",
                values: pcrValues,
            },
            {
                name: "Antigen Positivity",
                values: antigenValues,
            },
        ],
    };
}

export function compute7DayAverageTimeseries(data: TimeseriesData): TimeseriesData {
    const dates = data.dates.slice(6); // Adjust dates to match the 7-day average
    const averagedSeries = data.series.map(series => {
        const values = series.values;
        const averagedValues: number[] = [];
        for (let i = 0; i <= values.length - 7; i++) {
            let sum = 0;
            for (let j = 0; j < 7; j++) {
                sum += values[i + j];
            }
            averagedValues.push(sum / 7);
        }
        return {
            name: `${series.name} - 7day avg`,
            values: averagedValues,
        };
    });

    return {
        dates: dates,
        series: [...data.series, ...averagedSeries],
    };
}
