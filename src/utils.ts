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

export function computeMovingAverageTimeseries(data: TimeseriesData, windowSizes: number[]): TimeseriesData {
    const averagedSeries = data.series.flatMap(series => {
        return windowSizes.map(windowSize => {
            const values = series.values;
            const averagedValues: number[] = [];
            for (let i = 0; i < values.length; i++) {
                let sum = 0;
                for (let j = 0; j < windowSize; j++) {
                    const index = i - j;
                    if (index >= 0) {
                        sum += values[index];
                    } else {
                        sum += values[0]; // Assume the same value as the last datapoint if there are no days prior
                    }
                }
                averagedValues.push(sum / windowSize);
            }
            return {
                name: `${series.name} - ${windowSize}day avg`,
                values: averagedValues,
            };
        });
    });

    return {
        dates: dates,
        series: [...data.series, ...averagedSeries],
    };
}
