import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import { Chart, Legend } from 'chart.js/auto';
import { computeMovingAverageTimeseries, findLocalExtreme, shiftToAlignExtremeDates, type TimeseriesData } from "./utils";

const mzcrPositivity = mzcrPositivityImport as TimeseriesData;
const averagingWindows = [7, 3*28];
const mzcrPositivityEnhanced = computeMovingAverageTimeseries(mzcrPositivity, averagingWindows);

// Assuming computeMovingAverageTimeseries and transformMzcrDataToTimeseries functions are updated to handle the new structure

// Local storage keys
const TIME_RANGE_KEY = "selectedTimeRange";
const DATASET_VISIBILITY_KEY = "datasetVisibility";

const container = document.getElementById("root");
renderPage(container);

function renderPage(rootDiv: HTMLElement | null) {
    if (!rootDiv) {
        console.error("Root element not found.");
        return;
    }

    const currentChartHolder : {chart: Chart | undefined } = { chart: undefined };

    const canvasContainer = document.createElement("div");
    canvasContainer.id = "canvasContainer";
    canvasContainer.style.width = "100vw"
    canvasContainer.style.height = "40vh"

    rootDiv.appendChild(canvasContainer);

    const canvas = document.createElement("canvas");
    canvas.id = "positivityChart";
    canvasContainer.appendChild(canvas);

    const storedTimeRange = initializeTimeRangeDropdown((timeRange) => { currentChartHolder.chart = updateChart(timeRange, mzcrPositivityEnhanced, canvas, currentChartHolder.chart)}, rootDiv);

    // Initial chart render with stored or default time range
    currentChartHolder.chart = updateChart(storedTimeRange, mzcrPositivityEnhanced, canvas);
}

function updateChart(timeRange: string, data: TimeseriesData, canvas: HTMLCanvasElement, previousChartInstance?: Chart) {
    // Destroy existing chart if it exists
    if (previousChartInstance) {
        previousChartInstance.destroy();
    }

    let cutoffDateString = data.dates[0] ?? new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Retrieve dataset visibility from local storage
    let datasetVisibility: { [key: string]: boolean } = {};
    try {
        const storedVisibility = localStorage.getItem(DATASET_VISIBILITY_KEY);
        datasetVisibility = storedVisibility ? JSON.parse(storedVisibility) : {};
    } catch (error) {
        console.error("Error parsing dataset visibility from local storage:", error);
    }

    const localMaximaDatasets = generateLocalExtremeDataset(data, datasetVisibility, cutoffDateString, 'maxima', "red");
    const localMinimaDatasets = generateLocalExtremeDataset(data, datasetVisibility, cutoffDateString, 'minima', "blue");
    data = shiftToAlignExtremeDates(data, data.series.map(series => findLocalExtreme(series, averagingWindows[1], 'maxima')).flat()[0], 1, 2);
    
    // Prepare data for chart
    const colorPalettePCR = [
        "#1f77b4", "#aec7e8", "#ffbb78", "#2ca02c", "#98df8a", 
        "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b"
    ];
    const colorPaletteNonPCR = [
        "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", 
        "#dbdb8d", "#17becf", "#9edae5", "#ff7f0e", "#ffbb78"
    ];
    const datasets = data.series.map((series, index) => {
        const isVisible = datasetVisibility[series.name] !== undefined ? datasetVisibility[series.name] : true;
        const colorPalette = series.name.toLowerCase().includes("pcr") ? colorPalettePCR : colorPaletteNonPCR;
        return {
            label: series.name,
            data: series.values.slice(data.dates.findIndex(d => d > cutoffDateString)),
            borderColor: colorPalette[index % colorPalette.length],
            fill: false,
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 0,
        };
    });

    datasets.push(...localMaximaDatasets);
    datasets.push(...localMinimaDatasets);

    return new Chart(canvas, {
        type: "line",
        data: {
            labels: data.dates.filter(d => d > cutoffDateString),
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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

function generateLocalExtremeDataset(data: TimeseriesData, datasetVisibility: { [key: string]: boolean; }, cutoffDateString: string, extreme: 'minima' | 'maxima', color: string) {
    const localExtremePerSeries = data.series.map(series => findLocalExtreme(series, averagingWindows[1], extreme));
    return localExtremePerSeries.flat().map(extrSeries => {
        const isVisible = datasetVisibility[extrSeries.name] !== undefined ? datasetVisibility[extrSeries.name] : true;
        return {
            label: extrSeries.name,
            data: extrSeries.indices.map(index => ({
                x: data.dates[index],
                y: data.series.find(series => series.name === extrSeries.originalSeriesName)?.values[index] ?? -10
            })).filter(dp => dp.x > cutoffDateString) as any[], // make it any to satisfy types, the typing assumes basic data structure (with labels separately) but the library supports this; it's probably fixable but not worth figuring it out
            borderColor: color,
            backgroundColor: color,
            fill: false,
            hidden: !isVisible,
            borderWidth: 1,
            pointRadius: 5,
            type: "scatter",
            showLine: false
        };
    });
}

function initializeTimeRangeDropdown(onTimeRangeChange: (timeRange: string) => void, container: HTMLElement) {
    const timeRangeSelect = document.createElement("select");
    timeRangeSelect.id = "timeRangeSelect";
    const options = [
        { value: "30", label: "Last Month" },
        { value: "90", label: "Last 90 Days" },
        { value: "365", label: "Last Year" },
        { value: `${365*2}`, label: "Last 2 Years" },
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
