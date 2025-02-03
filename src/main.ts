import type { MzcrCovidTestPositivity } from "./shared";
import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import Chart from 'chart.js/auto';

const mzcrPositivity = mzcrPositivityImport as MzcrCovidTestPositivity[];
console.log("Test positivity data from MZCR:", mzcrPositivity);

function compute7DayAverages(data: MzcrCovidTestPositivity[]): MzcrCovidTestPositivity[] {
    // Sort data ascending by date (assumes date is in YYYY-MM-DD format)
    const sortedData = [...data].sort((a, b) => a.datum.localeCompare(b.datum));
    const result: MzcrCovidTestPositivity[] = [];
    for (let i = 0; i <= sortedData.length - 7; i++) {
        let sumPcr = 0;
        let sumAntigen = 0;
        for (let j = 0; j < 7; j++) {
            sumPcr += sortedData[i + j].pcrPositivity;
            sumAntigen += sortedData[i + j].antigenPositivity;
        }
        result.push({
            datum: sortedData[i + 6].datum, // use last date in the window
            pcrPositivity: sumPcr / 7,
            antigenPositivity: sumAntigen / 7,
        });
    }
    return result;
}

const weeklyAverages = compute7DayAverages(mzcrPositivity);

// Add a table to the root div with mzcrPositivity data
const container = document.getElementById("root");
if (container) {
    const canvas = document.createElement("canvas");
    canvas.id = "positivityChart";
    container.appendChild(canvas);

    // Prepare original data sorted ascending by date
    const sortedOriginal = [...mzcrPositivity].sort((a, b) => a.datum.localeCompare(b.datum));
    const originalLabels = sortedOriginal.map(item => item.datum);
    const pcrOriginalData = sortedOriginal.map(item => item.pcrPositivity);
    const antigenOriginalData = sortedOriginal.map(item => item.antigenPositivity);

    // Calculate overall weekly averages
    const pcrWeeklyAvg = weeklyAverages.map(item => item.pcrPositivity);
    const antigenWeeklyAvg = weeklyAverages.map(item => item.antigenPositivity);
    
    new Chart(canvas, {
        type: "line",
        data: {
            labels: originalLabels,
            datasets: [
                {
                    label: "PCR Positivity (%) - Daily",
                    data: pcrOriginalData,
                    borderColor: "blue",
                    fill: false,
                },
                {
                    label: "Antigen Positivity (%) - Daily",
                    data: antigenOriginalData,
                    borderColor: "red",
                    fill: false,
                },
                {
                    label: `PCR Positivity (%) - 7day average Daily`,
                    // Map weekly averages as {x, y} points
                    data: pcrWeeklyAvg,
                    borderColor: "cyan",
                    borderDash: [5, 5],
                    fill: false,
                },
                {
                    label: "Antigen Positivity (%) - 7day average Daily",
                    data: antigenWeeklyAvg,
                    borderColor: "orange",
                    borderDash: [5, 5],
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "COVID Test Positivity (MZCR Data)"
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

    const table = document.createElement("table");
    // Create header row
    const headerRow = document.createElement("tr");
    ["Datum", "PCR Positivity (%)", "Antigen Positivity (%)"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create data rows
    mzcrPositivity.reverse().forEach((row: { datum: string; pcrPositivity: number; antigenPositivity: number }) => {
        const tr = document.createElement("tr");
        const datumTd = document.createElement("td");
        datumTd.textContent = row.datum;
        tr.appendChild(datumTd);

        const pcrTd = document.createElement("td");
        pcrTd.textContent = row.pcrPositivity.toFixed(2);
        tr.appendChild(pcrTd);

        const antigenTd = document.createElement("td");
        antigenTd.textContent = row.antigenPositivity.toFixed(2);
        tr.appendChild(antigenTd);

        table.appendChild(tr);
    });
    container.appendChild(table);
} else {
    console.error("Root element not found.");
}




