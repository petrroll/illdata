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
            const averagedValues = series.values.map((v, i) => {
                let sum = 0;
                let count = 0;
                for (let j = Math.floor(-windowSize/2); j <= Math.floor(windowSize/2); j++) {
                    const index = i + j;
                    count += 1;
                    if (index >= 0 && index < series.values.length) {
                        sum += series.values[index];
                    } else if (index < 0) {
                        sum += series.values[0]; // Assume the same value as the first datapoint if there are no days prior
                    } else if (index >= series.values.length) {
                        sum += series.values[series.values.length - 1]; // Assume the same value as the last datapoint if there are no future days
                    }
                }
                return sum / count;
            })
            return {
                name: `${series.name} - ${windowSize}day avg`,
                values: averagedValues,
            };
        });
    });

    return {
        dates: data.dates,
        series: [...data.series, ...averagedSeries],
    };
}
