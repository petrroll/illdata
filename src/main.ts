import type { MzcrCovidTestPositivity } from "./shared";
import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import { Chart, Legend } from 'chart.js/auto';
import { transformMzcrDataToTimeseries, compute7DayAverageTimeseries } from "./utils";

const mzcrPositivity = mzcrPositivityImport as MzcrCovidTestPositivity[];
const timeseriesData = transformMzcrDataToTimeseries(mzcrPositivity);

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
    const storedTimeRange = initializeTimeRangeDropdown((timeRange) => { currentChartHolder.chart = updateChart(timeRange, canvas, currentChartHolder.chart)}, container);

    // Initial chart render with stored or default time range
    currentChartHolder.chart = updateChart(storedTimeRange, canvas);
}

function updateChart(timeRange: string, canvas: HTMLCanvasElement, previousChartInstance?: Chart) {
    // Destroy existing chart if it exists
    if (previousChartInstance) {
        previousChartInstance.destroy();
    }

    let filteredTimeseriesData = { ...timeseriesData }; // Copy the original data

    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

        filteredTimeseriesData.dates = timeseriesData.dates.filter(date => date >= cutoffDateString);
        filteredTimeseriesData.series = timeseriesData.series.map(series => ({
            ...series,
            values: series.values.slice(timeseriesData.dates.findIndex(date => date >= cutoffDateString))
        }));
    }

    const weeklyAverageTimeseries = compute7DayAverageTimeseries(filteredTimeseriesData);

    // Retrieve dataset visibility from local storage
    let datasetVisibility: { [key: string]: boolean } = {};
    try {
        const storedVisibility = localStorage.getItem(DATASET_VISIBILITY_KEY);
        datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    // Prepare data for chart
    const labels = weeklyAverageTimeseries.dates;
    const datasets = weeklyAverageTimeseries.series.map(series => {
        const isVisible = datasetVisibility[series.name] !== undefined ? datasetVisibility[series.name] : true;
        return {
            label: series.name,
            data: series.values,
            borderColor: series.name.includes("PCR") ? "blue" : "red",
            fill: false,
            borderDash: series.name.includes("avg") ? [5, 5] : [],
            hidden: !isVisible,
            pointStyle: 'line',
            borderWidth: 1,
        };
    });

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
                    text: "COVID Test Positivity (MZCR Data) - 7-day Averages"
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
