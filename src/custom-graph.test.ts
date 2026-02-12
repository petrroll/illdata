import { describe, test, expect } from 'bun:test';
import { assembleCustomGraphData, type CustomGraphSelection, type SourceChartInfo } from './custom-graph';
import type { PositivitySeries, ScalarSeries, Datapoint } from './utils';

// Helper to create a positivity series 
function makePositivitySeries(
    name: string, 
    values: Datapoint[], 
    opts?: { type?: 'raw' | 'averaged'; country?: string; survtype?: string }
): PositivitySeries {
    return {
        name,
        values,
        type: opts?.type ?? 'averaged',
        frequencyInDays: 7,
        dataType: 'positivity',
        ...(opts?.country ? { country: opts.country } : {}),
        ...(opts?.survtype ? { survtype: opts.survtype } : {})
    };
}

// Helper to create a scalar (wastewater) series
function makeScalarSeries(
    name: string, 
    values: { virusLoad: number }[], 
    opts?: { type?: 'raw' | 'averaged' }
): ScalarSeries {
    return {
        name,
        values,
        type: opts?.type ?? 'averaged',
        frequencyInDays: 7,
        dataType: 'scalar'
    };
}

function dp(positive: number, tests: number): Datapoint {
    return { positive, tests };
}

describe('assembleCustomGraphData', () => {
    test('returns empty data for empty selections', () => {
        const result = assembleCustomGraphData([], [], true);
        expect(result.dates).toEqual([]);
        expect(result.series).toEqual([]);
    });

    test('returns correct series from single source chart', () => {
        const sourceChart: SourceChartInfo = {
            data: {
                dates: ['2025-01-01', '2025-01-08'],
                series: [
                    makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(10, 100), dp(20, 100)])
                ]
            },
            shortTitle: 'MZCR'
        };

        const selections: CustomGraphSelection[] = [
            { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
        ];

        const result = assembleCustomGraphData(selections, [sourceChart], true);
        expect(result.dates).toEqual(['2025-01-01', '2025-01-08']);
        expect(result.series).toHaveLength(1);
        expect(result.series[0].name).toBe('SARS-CoV-2 Positivity (28d avg) (MZCR)');
    });

    describe('country filtering', () => {
        // Reproduce the original bug: without country filter, find() returns
        // alphabetically first country (Austria) which may have zero data
        const euChart: SourceChartInfo = {
            data: {
                dates: ['2025-01-01', '2025-01-08'],
                series: [
                    // Austria - zero test data (the bug scenario)
                    makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                        [dp(0, 0), dp(0, 0)],
                        { country: 'Austria', survtype: 'non-sentinel' }
                    ),
                    makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                        [dp(0, 0), dp(0, 0)],
                        { country: 'Austria', survtype: 'primary care sentinel' }
                    ),
                    // EU/EEA - has real data
                    makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                        [dp(50, 100), dp(60, 100)],
                        { country: 'EU/EEA', survtype: 'non-sentinel' }
                    ),
                    makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                        [dp(30, 100), dp(40, 100)],
                        { country: 'EU/EEA', survtype: 'primary care sentinel' }
                    ),
                    // Czechia - different data
                    makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                        [dp(15, 80), dp(25, 80)],
                        { country: 'Czechia', survtype: 'non-sentinel' }
                    ),
                ]
            },
            shortTitle: 'ECDC'
        };

        test('uses EU/EEA data when countryFilter is EU/EEA', () => {
            const chartWithFilter: SourceChartInfo = {
                ...euChart,
                countryFilter: 'EU/EEA'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chartWithFilter], true);
            expect(result.series).toHaveLength(1);
            // Should have EU/EEA's data (50 positive, 100 tests) not Austria's (0, 0)
            const values = result.series[0].values as Datapoint[];
            expect(values[0].positive).toBe(50);
            expect(values[0].tests).toBe(100);
        });

        test('uses Czechia data when countryFilter is Czechia', () => {
            const chartWithFilter: SourceChartInfo = {
                ...euChart,
                countryFilter: 'Czechia'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chartWithFilter], true);
            expect(result.series).toHaveLength(1);
            const values = result.series[0].values as Datapoint[];
            expect(values[0].positive).toBe(15);
            expect(values[0].tests).toBe(80);
        });

        test('includes country name in suffix when not EU/EEA', () => {
            const chartWithFilter: SourceChartInfo = {
                ...euChart,
                countryFilter: 'Czechia'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chartWithFilter], true);
            expect(result.series[0].name).toContain('ECDC - Czechia');
        });

        test('does not include country name in suffix for EU/EEA', () => {
            const chartWithFilter: SourceChartInfo = {
                ...euChart,
                countryFilter: 'EU/EEA'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chartWithFilter], true);
            expect(result.series[0].name).toBe('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg) (ECDC)');
            expect(result.series[0].name).not.toContain('EU/EEA');
        });

        test('without country filter picks the first match (bug scenario)', () => {
            // This documents the behavior WITHOUT country filter — 
            // Austria (first alphabetically) with zero data gets returned
            const chartWithoutFilter: SourceChartInfo = {
                ...euChart
                // No countryFilter set
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chartWithoutFilter], true);
            expect(result.series).toHaveLength(1);
            // Without country filter, all series match and find() returns Austria (first)
            const values = result.series[0].values as Datapoint[];
            expect(values[0].positive).toBe(0);  // Austria's zero data
            expect(values[0].tests).toBe(0);
        });
    });

    describe('survtype filtering', () => {
        const euChart: SourceChartInfo = {
            data: {
                dates: ['2025-01-01', '2025-01-08'],
                series: [
                    makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                        [dp(50, 100), dp(60, 100)],
                        { country: 'EU/EEA', survtype: 'non-sentinel' }
                    ),
                    makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                        [dp(30, 200), dp(40, 200)],
                        { country: 'EU/EEA', survtype: 'primary care sentinel' }
                    ),
                ]
            },
            shortTitle: 'ECDC',
            countryFilter: 'EU/EEA'
        };

        test('returns Non-Sentinel series when survtype filter is non-sentinel', () => {
            const chart: SourceChartInfo = {
                ...euChart,
                survtypeFilter: 'non-sentinel'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(1);
            const values = result.series[0].values as Datapoint[];
            expect(values[0].tests).toBe(100);
        });

        test('returns Sentinel series when survtype filter is primary care sentinel', () => {
            const chart: SourceChartInfo = {
                ...euChart,
                survtypeFilter: 'primary care sentinel'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(1);
            const values = result.series[0].values as Datapoint[];
            expect(values[0].tests).toBe(200);
        });

        test('excludes Non-Sentinel when survtype filter is sentinel only', () => {
            const chart: SourceChartInfo = {
                ...euChart,
                survtypeFilter: 'primary care sentinel'
            };

            // Try to select Non-Sentinel — should not be found after filtering
            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });

        test('returns both survtypes when filter is "both"', () => {
            const chart: SourceChartInfo = {
                ...euChart,
                survtypeFilter: 'both'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' },
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(2);
        });
    });

    describe('shifted series handling', () => {
        const chart: SourceChartInfo = {
            data: {
                dates: ['2025-01-01', '2025-01-08'],
                series: [
                    makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(10, 100), dp(20, 100)]),
                    makePositivitySeries('SARS-CoV-2 Positivity (28d avg) shifted by 1 wave -30d', [dp(10, 100), dp(20, 100)])
                ]
            },
            shortTitle: 'TEST'
        };

        test('includes shifted series when showShifted is true', () => {
            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg) shifted by 1 wave -30d' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(1);
        });

        test('excludes shifted series when showShifted is false', () => {
            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg) shifted by 1 wave -30d' }
            ];

            const result = assembleCustomGraphData(selections, [chart], false);
            expect(result.series).toHaveLength(0);
        });
    });

    describe('scalar series filtering', () => {
        test('excludes scalar/wastewater series', () => {
            const chart: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01', '2025-01-08'],
                    series: [
                        makeScalarSeries('SARS-CoV-2 Wastewater (28d avg)', [{ virusLoad: 100 }, { virusLoad: 200 }])
                    ]
                },
                shortTitle: 'DE-WW'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Wastewater (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });
    });

    describe('deduplication', () => {
        test('does not duplicate series selected multiple times', () => {
            const chart: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01'],
                    series: [
                        makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(10, 100)])
                    ]
                },
                shortTitle: 'TEST'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg)' },
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(1);
        });
    });

    describe('skips custom graph as source', () => {
        test('ignores selections pointing to a custom graph chart', () => {
            const chart: SourceChartInfo = {
                data: { dates: ['2025-01-01'], series: [] },
                shortTitle: 'Custom',
                isCustomGraph: true
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });
    });

    describe('multi-source date alignment and interpolation', () => {
        test('merges dates from multiple source charts', () => {
            const chart1: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01', '2025-01-08', '2025-01-15'],
                    series: [
                        makePositivitySeries('PCR Positivity (28d avg)', [dp(10, 100), dp(20, 100), dp(30, 100)])
                    ]
                },
                shortTitle: 'CZ'
            };
            const chart2: SourceChartInfo = {
                data: {
                    dates: ['2025-01-04', '2025-01-11'],
                    series: [
                        makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(40, 200), dp(50, 200)])
                    ]
                },
                shortTitle: 'ECDC',
                countryFilter: 'EU/EEA'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'PCR Positivity (28d avg)' },
                { sourceChartIndex: 1, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart1, chart2], true);
            // Should contain all unique dates sorted
            expect(result.dates).toEqual(['2025-01-01', '2025-01-04', '2025-01-08', '2025-01-11', '2025-01-15']);
            expect(result.series).toHaveLength(2);
        });

        test('interpolates missing data points between existing ones', () => {
            const chart1: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01', '2025-01-15'],
                    series: [
                        makePositivitySeries('PCR Positivity (28d avg)', [dp(10, 100), dp(30, 100)])
                    ]
                },
                shortTitle: 'CZ'
            };
            const chart2: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01', '2025-01-08', '2025-01-15'],
                    series: [
                        makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(40, 200), dp(50, 200), dp(60, 200)])
                    ]
                },
                shortTitle: 'ECDC',
                countryFilter: 'EU/EEA'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'PCR Positivity (28d avg)' },
                { sourceChartIndex: 1, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart1, chart2], true);
            
            // chart1's series should have an interpolated value at 2025-01-08
            // which is midpoint between 2025-01-01 (10/100) and 2025-01-15 (30/100)
            const czSeries = result.series.find(s => s.name.includes('CZ'));
            expect(czSeries).toBeDefined();
            const czValues = czSeries!.values as Datapoint[];
            // Index 0: 2025-01-01 = original dp(10, 100)
            // Index 1: 2025-01-08 = interpolated (midpoint) dp(20, 100) 
            // Index 2: 2025-01-15 = original dp(30, 100)
            expect(czValues[0].positive).toBe(10);
            expect(czValues[1].positive).toBe(20);  // interpolated midpoint
            expect(czValues[1].tests).toBe(100);     // interpolated midpoint
            expect(czValues[2].positive).toBe(30);
        });

        test('interpolates using actual date distances', () => {
            const chart1: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01', '2025-01-15'],
                    series: [
                        makePositivitySeries('PCR Positivity (28d avg)', [dp(10, 100), dp(30, 100)])
                    ]
                },
                shortTitle: 'CZ'
            };
            const chart2: SourceChartInfo = {
                data: {
                    dates: ['2025-01-07'],
                    series: [
                        makePositivitySeries('SARS-CoV-2 Positivity (28d avg)', [dp(40, 200)])
                    ]
                },
                shortTitle: 'ECDC',
                countryFilter: 'EU/EEA'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'PCR Positivity (28d avg)' },
                { sourceChartIndex: 1, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart1, chart2], true);
            const czSeries = result.series.find(s => s.name.includes('CZ'));
            expect(czSeries).toBeDefined();
            const czValues = czSeries!.values as Datapoint[];

            // 2025-01-07 is 6 days after 2025-01-01 and 8 days before 2025-01-15
            const expectedPositive = 10 + (30 - 10) * (6 / 14);
            const expectedTests = 100 + (100 - 100) * (6 / 14);
            expect(czValues[1].positive).toBeCloseTo(expectedPositive, 3);
            expect(czValues[1].tests).toBeCloseTo(expectedTests, 3);
        });
    });

    describe('combined country + survtype filtering', () => {
        test('applies both country and survtype filters together', () => {
            const chart: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01'],
                    series: [
                        // Austria Non-Sentinel - zero data
                        makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                            [dp(0, 0)],
                            { country: 'Austria', survtype: 'non-sentinel' }
                        ),
                        // Austria Sentinel - zero data  
                        makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                            [dp(0, 0)],
                            { country: 'Austria', survtype: 'primary care sentinel' }
                        ),
                        // EU/EEA Non-Sentinel - real data
                        makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                            [dp(50, 100)],
                            { country: 'EU/EEA', survtype: 'non-sentinel' }
                        ),
                        // EU/EEA Sentinel - real data
                        makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                            [dp(30, 200)],
                            { country: 'EU/EEA', survtype: 'primary care sentinel' }
                        ),
                    ]
                },
                shortTitle: 'ECDC',
                countryFilter: 'EU/EEA',
                survtypeFilter: 'non-sentinel'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(1);
            const values = result.series[0].values as Datapoint[];
            // Should get EU/EEA Non-Sentinel data, not Austria's
            expect(values[0].positive).toBe(50);
            expect(values[0].tests).toBe(100);
        });

        test('returns nothing when survtype filter excludes the selected series', () => {
            const chart: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01'],
                    series: [
                        makePositivitySeries('SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)', 
                            [dp(50, 100)],
                            { country: 'EU/EEA', survtype: 'non-sentinel' }
                        ),
                        makePositivitySeries('SARS-CoV-2 Positivity (Sentinel) (28d avg)', 
                            [dp(30, 200)],
                            { country: 'EU/EEA', survtype: 'primary care sentinel' }
                        ),
                    ]
                },
                shortTitle: 'ECDC',
                countryFilter: 'EU/EEA',
                survtypeFilter: 'primary care sentinel'
            };

            // Try to select Non-Sentinel when filter says sentinel only
            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'SARS-CoV-2 Positivity (Non-Sentinel) (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });
    });

    describe('invalid selections', () => {
        test('handles out-of-range source chart index', () => {
            const chart: SourceChartInfo = {
                data: { dates: ['2025-01-01'], series: [] },
                shortTitle: 'TEST'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 99, seriesName: 'SARS-CoV-2 Positivity (28d avg)' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });

        test('handles non-existent series name', () => {
            const chart: SourceChartInfo = {
                data: {
                    dates: ['2025-01-01'],
                    series: [
                        makePositivitySeries('PCR Positivity (28d avg)', [dp(10, 100)])
                    ]
                },
                shortTitle: 'TEST'
            };

            const selections: CustomGraphSelection[] = [
                { sourceChartIndex: 0, seriesName: 'Does Not Exist' }
            ];

            const result = assembleCustomGraphData(selections, [chart], true);
            expect(result.series).toHaveLength(0);
        });
    });
});
