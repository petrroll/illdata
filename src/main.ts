import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, type TimeseriesData } from "./utils";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, [7, 28]);

// Assuming computeMovingAverageTimeseries and transformMzcrDataToTimeseries functions are updated to handle the new structure

// Local storage keys
const TIME_RANGE_KEY = "selectedTimeRange";
const DATASET_VISIBILITY_KEY = "datasetVisibility";


const container = document.getElementById("root");
renderPage(container);

function renderPage(container: HTMLElement | null) {
    if (!container) {
        console.error("Root element not found.");
        return;
    }

    const currentChartHolder : {chart: Chart | undefined } = { chart: undefined };

    const canvas = document.createElement("canvas");
    canvas.id = "positivityChart";
    container.appendChild(canvas);
    const storedTimeRange = initializeTimeRangeDropdown((timeRange) => { currentChartHolder.chart = updateChart(timeRange, mzcrPositivityEnhanced, canvas, currentChartHolder.chart)}, container);

    // Initial chart render with stored or default time range
    currentChartHolder.chart = updateChart(storedTimeRange, mzcrPositivityEnhanced, canvas);
}

function updateChart(timeRange: string, data: TimeseriesData, canvas: HTMLCanvasElement, previousChartInstance?: Chart) {
    // Destroy existing chart if it exists
    if (previousChartInstance) {
        previousChartInstance.destroy();
    }

    let filteredTimeseriesData = { ...data }; // Copy the original data

    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

        filteredTimeseriesData.dates = data.dates.filter(date => date >= cutoffDateString);
        filteredTimeseriesData.series = data.series.map(series => ({
            ...series,
            values: series.values.slice(data.dates.findIndex(date => date >= cutoffDateString))
        }));
    }

    // Retrieve dataset visibility from local storage
    let datasetVisibility: { [key: string]: boolean } = {};
    try {
        const storedVisibility = localStorage.getItem(DATASET_VISIBILITY_KEY);
        datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    // Prepare data for chart
    const labels = filteredTimeseriesData.dates;
    const datasets = filteredTimeseriesData.series.map(series => {
        const isVisible = datasetVisibility[series.name] !== undefined ? datasetVisibility[series.name] : true;
        return {
            label: series.name,
            data: series.values,
            borderColor: series.name.includes("PCR") ? "blue" : "red",
            fill: false,
            borderDash: series.name.includes("avg") ? [5, 5] : [],
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 0,
        };
    });

    // Find local maxima for window size 28
    const localMaximaPerSeries = data.series.map(series => findLocalExtreme(series, 28, "maxima"));
    const localMaximaDatasets = localMaximaPerSeries.flat().map(maximaSeries => {
        const isVisible = datasetVisibility[maximaSeries.name] !== undefined ? datasetVisibility[maximaSeries.name] : true;
        return {
            label: maximaSeries.name,
            data: maximaSeries.indices.map(index => ({
                x: labels[index],
                y: filteredTimeseriesData.series.find(series => series.name === maximaSeries.originalSeriesName)?.values[index] ?? -10
            })) as any[], // make it any to satisfy types, the typing assumes basic data structure (with labels separately) but the library supports this; it's probably fixable but not worth figuring it out
            borderColor: "green",
            backgroundColor: "green",
            fill: false,
            borderDash: [],
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 5,
            type: "scatter",
            showLine: false
        };
    });
    datasets.push(...localMaximaDatasets);

    const localMinimaPerSeries = data.series.map(series => findLocalExtreme(series, 28, "maxima"));
    const localMinimaDatasets = localMinimaPerSeries.flat().map(extrSeries => {
        const isVisible = datasetVisibility[extrSeries.name] !== undefined ? datasetVisibility[extrSeries.name] : true;
        return {
            label: extrSeries.name,
            data: extrSeries.indices.map(index => ({
                x: labels[index],
                y: filteredTimeseriesData.series.find(series => series.name === extrSeries.originalSeriesName)?.values[index] ?? -10
            })) as any[], // make it any to satisfy types, the typing assumes basic data structure (with labels separately) but the library supports this; it's probably fixable but not worth figuring it out
            borderColor: "blue",
            backgroundColor: "blue",
            fill: false,
            borderDash: [],
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 5,
            type: "scatter",
            showLine: false
        };
    });
    datasets.push(...localMinimaDatasets);

    return new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "COVID Test Positivity (MZCR Data) - Moving Averages"
                },
                legend: {
                    onClick: (evt, item, legend) => {
                        Legend.defaults!.onClick(evt, item, legend)

                        // Store the new visibility state
                        datasetVisibility[item.text] = !item.hidden;
                        localStorage.setItem(DATASET_VISIBILITY_KEY, JSON.stringify(datasetVisibility));
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(tickValue: string | number) {
                            if (typeof tickValue === 'number') {
                                return tickValue.toFixed(2) + "%";
                            }
                            return tickValue;
                        }
                    }
                }
            }
        }
    });
}

function initializeTimeRangeDropdown(onTimeRangeChange: (timeRange: string) => void, container: HTMLElement) {
    const timeRangeSelect = document.createElement("select");
    timeRangeSelect.id = "timeRangeSelect";
    const options = [
        { value: "30", label: "Last Month" },
        { value: "90", label: "Last 90 Days" },
        { value: "365", label: "Last Year" },
        { value: "all", label: "All Time" },
    ];
    options.forEach(option => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        timeRangeSelect.appendChild(optionElement);
    });
    timeRangeSelect.addEventListener("change", (event) => {
        const selectedTimeRange = (event.target as HTMLSelectElement).value;
        localStorage.setItem(TIME_RANGE_KEY, selectedTimeRange);
        onTimeRangeChange(selectedTimeRange);
    });

    // Load stored time range from local storage
    const storedTimeRange = localStorage.getItem(TIME_RANGE_KEY) || "all";
    timeRangeSelect.value = storedTimeRange;
    container.appendChild(timeRangeSelect);
    return storedTimeRange;
}
