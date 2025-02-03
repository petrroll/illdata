import type { MzcrCovidTestPositivity } from "./shared";
import mzcrPositivityImport from "../data_processed/cr_cov_mzcr/positivity_data.json" with { type: "json" };
import Chart from 'chart.js/auto';

const mzcrPositivity = mzcrPositivityImport as MzcrCovidTestPositivity[];
console.log("Test positivity data from MZCR:", mzcrPositivity);

// Add a table to the root div with mzcrPositivity data
const container = document.getElementById("root");
if (container) {
    const canvas = document.createElement("canvas");
    canvas.id = "positivityChart";
    container.appendChild(canvas);

    // Prepare data for the chart
    const labels = mzcrPositivity.map(item => item.datum);
    const pcrData = mzcrPositivity.map(item => item.pcrPositivity);
    const antigenData = mzcrPositivity.map(item => item.antigenPositivity);

    new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "PCR Positivity (%)",
                    data: pcrData,
                    borderColor: "blue",
                    fill: false,
                },
                {
                    label: "Antigen Positivity (%)",
                    data: antigenData,
                    borderColor: "red",
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




