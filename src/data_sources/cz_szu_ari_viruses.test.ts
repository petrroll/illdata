import { describe, expect, test } from "bun:test";
import { computeCzSzuAriVirusesData, extractVirusPdfEntries, parseVirusResultPdfText, type SzuVirusDetectionRow } from "./cz_szu_ari_viruses";
import type { Datapoint } from "../utils";

describe("extractVirusPdfEntries", () => {
    test("finds Výsledky-viry PDF links with calendar week metadata", () => {
        const html = `
            <table><tr>
                <td>4.KT 2026</td>
                <td><a href="/wp-content/uploads/2026/01/ari.pdf">ARI+komentář</a></td>
                <td><a href="/wp-content/uploads/2026/01/Vysledky-viry-4KT.pdf">Výsledky-viry</a></td>
            </tr></table>`;

        expect(extractVirusPdfEntries(html, "https://szu.gov.cz/publikace-szu/data/akutni-respiracni-infekce-chripka/")).toEqual([
            {
                year: 2026,
                week: 4,
                url: "https://szu.gov.cz/wp-content/uploads/2026/01/Vysledky-viry-4KT.pdf",
            },
        ]);
    });
});

describe("parseVirusResultPdfText", () => {
    test("parses row-oriented virus counts from extracted PDF text", () => {
        const text = `
            Týdenní výsledky virové surveillance ARI
            Celkem vyšetřeno 200 vzorků metodou PCR.
            SARS-CoV-2 12
            Chřipka A 1 2 3 6
            Chřipka B 4
            RSV 8`;

        const rows = parseVirusResultPdfText(text, { year: 2026, week: 4, url: "https://example.test/viry.pdf" });

        expect(rows).toContainEqual({ date: "2026-01-19", pathogen: "SARS-CoV-2", positive: 12, tests: 200, sourceUrl: "https://example.test/viry.pdf" });
        expect(rows).toContainEqual({ date: "2026-01-19", pathogen: "Influenza", positive: 3, tests: 200, sourceUrl: "https://example.test/viry.pdf" });
        expect(rows).toContainEqual({ date: "2026-01-19", pathogen: "Influenza", positive: 4, tests: 200, sourceUrl: "https://example.test/viry.pdf" });
        expect(rows).toContainEqual({ date: "2026-01-19", pathogen: "RSV", positive: 8, tests: 200, sourceUrl: "https://example.test/viry.pdf" });
    });

    test("uses weekly values instead of cumulative totals from season tables", () => {
        const text = `
            Laboratorní vyšetření podle typu viru
            Celkem vyšetřeno 639 912 1 076 2 627
            SARS-CoV-2 28 46 203 277
            Rhinovirus 1 2 5 8`;

        const rows = parseVirusResultPdfText(text, { year: 2025, week: 42, url: "https://example.test/viry.pdf" });

        expect(rows).toContainEqual({ date: "2025-10-13", pathogen: "SARS-CoV-2", positive: 203, tests: 1076, sourceUrl: "https://example.test/viry.pdf" });
        expect(rows).toContainEqual({ date: "2025-10-13", pathogen: "Rhinovirus", positive: 5, tests: 1076, sourceUrl: "https://example.test/viry.pdf" });
    });

    test("does not concatenate adjacent sample-count columns into a huge number", () => {
        const text = `
            Celkem vyšetřeno 639 912 1 551 vzorků
            SARS-CoV-2 28 46 74`;

        const rows = parseVirusResultPdfText(text, { year: 2025, week: 41, url: "https://example.test/viry.pdf" });

        expect(rows).toContainEqual({ date: "2025-10-06", pathogen: "SARS-CoV-2", positive: 46, tests: 912, sourceUrl: "https://example.test/viry.pdf" });
    });

    test("parses compact column-oriented virus counts from extracted PDF text", () => {
        const text = `
            Počet vyšetřených vzorků: 150
            SARS-CoV-2 RSV Adenovirus Rhinovirus
            Pozitivní nálezy 9 12 0 3`;

        const rows = parseVirusResultPdfText(text, { year: 2025, week: 51, url: "https://example.test/viry.pdf" });

        expect(rows.map(row => [row.pathogen, row.positive])).toEqual([
            ["SARS-CoV-2", 9],
            ["RSV", 12],
            ["Rhinovirus", 3],
        ]);
    });
});

describe("computeCzSzuAriVirusesData", () => {
    test("builds weekly positivity series and aggregates influenza subtypes", () => {
        const rows: SzuVirusDetectionRow[] = [
            { date: "2026-01-19", pathogen: "SARS-CoV-2", positive: 12, tests: 200, sourceUrl: "" },
            { date: "2026-01-19", pathogen: "Influenza A", positive: 6, tests: 200, sourceUrl: "" },
            { date: "2026-01-19", pathogen: "Influenza B", positive: 4, tests: 200, sourceUrl: "" },
            { date: "2026-01-26", pathogen: "SARS-CoV-2", positive: 5, tests: 100, sourceUrl: "" },
        ];

        const result = computeCzSzuAriVirusesData(rows);

        expect(result.dates).toEqual(["2026-01-19", "2026-01-26"]);
        const covid = result.series.find(series => series.name === "SARS-CoV-2 Positivity");
        const influenza = result.series.find(series => series.name === "Influenza Positivity");
        expect((covid?.values[0] as Datapoint)).toEqual({ positive: 12, tests: 200 });
        expect((covid?.values[1] as Datapoint)).toEqual({ positive: 5, tests: 100 });
        expect((influenza?.values[0] as Datapoint)).toEqual({ positive: 10, tests: 200 });
        expect((influenza?.values[1] as Datapoint)).toEqual({ positive: 0, tests: 0 });
    });
});
