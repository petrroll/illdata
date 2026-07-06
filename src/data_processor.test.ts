import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { addBuildTimeDerivedSeries, processSource } from "./data_processor";
import type { TimeseriesData } from "./utils";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "illdata-data-processor-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe("processSource", () => {
    test("returns failed status and writes fallback data when a source fails", async () => {
        const dir = await makeTempDir();
        const outputPath = join(dir, "processed.json");
        const fallback = { rows: 0 };

        const status = await processSource(
            "Unavailable source",
            async () => { throw new Error("download failed"); },
            "input.csv",
            async () => [{ value: "1" }],
            data => ({ rows: data.length }),
            outputPath,
            fallback
        );

        expect(status).toEqual({
            name: "Unavailable source",
            status: "failed",
            outputPath,
            error: "download failed"
        });

        expect(JSON.parse(await readFile(outputPath, "utf-8"))).toEqual(fallback);
    });

    test("keeps existing processed data when a source fails", async () => {
        const dir = await makeTempDir();
        const outputPath = join(dir, "processed.json");
        const existing = { rows: 123 };
        await writeFile(outputPath, JSON.stringify(existing), "utf-8");

        await processSource(
            "Unavailable source",
            async () => { throw new Error("download failed"); },
            "input.csv",
            async () => [{ value: "1" }],
            data => ({ rows: data.length }),
            outputPath,
            { rows: 0 }
        );

        expect(JSON.parse(await readFile(outputPath, "utf-8"))).toEqual(existing);
    });

    test("returns ok status and saves computed data when a source succeeds", async () => {
        const dir = await makeTempDir();
        const outputPath = join(dir, "processed.json");

        const status = await processSource(
            "Available source",
            async () => {},
            "input.csv",
            async () => [{ value: "1" }, { value: "2" }],
            data => ({ rows: data.length }),
            outputPath,
            { rows: 0 }
        );

        expect(status).toEqual({
            name: "Available source",
            status: "ok",
            outputPath
        });
        expect(JSON.parse(await readFile(outputPath, "utf-8"))).toEqual({ rows: 2 });
    });
});

describe("addBuildTimeDerivedSeries", () => {
    test("adds 28d averaged series during data processing", () => {
        const input: TimeseriesData = {
            dates: ["2026-01-05", "2026-01-12"],
            series: [{
                name: "Weekly Scalar",
                values: [{ virusLoad: 10 }, { virusLoad: 20 }],
                type: "raw",
                frequencyInDays: 7,
                dataType: "scalar",
                ageGroup: "00+"
            }]
        };

        const result = addBuildTimeDerivedSeries(input);

        expect(result.series.map(series => series.name)).toEqual([
            "Weekly Scalar",
            "Weekly Scalar (28d avg)"
        ]);
        expect(result.series[1].type).toBe("averaged");
        expect(result.series[1].windowSizeInDays).toBe(28);
        expect(result.series[1].ageGroup).toBe("00+");
    });
});
