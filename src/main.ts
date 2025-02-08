import type { MzcrCovidTestPositivity } from "./shared";
import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import { Chart, Legend } from 'chart.js/auto';
import { transformMzcrDataToTimeseries, compute7DayAverageTimeseries } from "./utils";

const mzcrPositivity = mzcrPositivityImport as MzcrCovidTestPositivity[];
const timeseriesData = transformMzcrDataToTimeseries(mzcrPositivity);

// Local storage keys
const TIME_RANGE_KEY = "selectedTimeRange";
const DATASET_VISIBILITY_KEY = "datasetVisibility";

// Add time range selection
const container = document.getElementById("root");
if (container) {
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
    container.appendChild(timeRangeSelect);

    const canvas = document.createElement("canvas");
    canvas.id = "positivityChart";
    container.appendChild(canvas);

    let chartInstance: Chart | null = null; // Store the chart instance

    function updateChart(timeRange: string) {
        // Destroy existing chart if it exists
        if (chartInstance) {
            chartInstance.destroy();
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
        console.log("Weekly Average Timeseries Data:", weeklyAverageTimeseries);

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
                borderDash: series.name.includes("avg") ? [5, 5] : [], // Add dashed line for averages
                hidden: !isVisible,
            };
        });

        chartInstance = new Chart(canvas, {
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

    timeRangeSelect.addEventListener("change", (event) => {
        const selectedTimeRange = (event.target as HTMLSelectElement).value;
        localStorage.setItem(TIME_RANGE_KEY, selectedTimeRange);
        updateChart(selectedTimeRange);
    });

    // Load stored time range from local storage
    const storedTimeRange = localStorage.getItem(TIME_RANGE_KEY) || "all";
    timeRangeSelect.value = storedTimeRange;

    // Initial chart render with stored or default time range
    updateChart(storedTimeRange);
} else {
    console.error("Root element not found.");
}




