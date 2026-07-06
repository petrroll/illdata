import { describe, test, expect, afterEach } from 'bun:test';
import { parseDelimited, downloadCsv } from './ioUtils';

describe('parseDelimited Tests', () => {
    test('parses custom delimiters correctly', () => {
        const content = `A;B
1;2
3;4`;
        const result = parseDelimited(content, ';', 'semicolon-separated CSV');
        expect(result).toEqual([
            { A: '1', B: '2' },
            { A: '3', B: '4' }
        ]);
    });

    test('throws a descriptive error on empty content', () => {
        expect(() => parseDelimited('', ',', 'CSV')).toThrow('Cannot parse CSV data: content is empty');
        expect(() => parseDelimited('   \n  \n', ',', 'CSV')).toThrow('Cannot parse CSV data: content is empty');
    });
});

describe('downloadCsv Tests', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test('retries and succeeds after a transient empty response', async () => {
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            const body = calls === 1 ? '' : 'A,B\n1,2';
            return new Response(body, { status: 200 });
        }) as typeof fetch;

        const content = await downloadCsv('https://example.com/data.csv', 3, 0);
        expect(calls).toBe(2);
        expect(content).toBe('A,B\n1,2');
    });

    test('retries and succeeds after a transient network error', async () => {
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            if (calls === 1) throw new Error('Unable to connect');
            return new Response('A,B\n1,2', { status: 200 });
        }) as typeof fetch;

        const content = await downloadCsv('https://example.com/data.csv', 3, 0);
        expect(calls).toBe(2);
        expect(content).toBe('A,B\n1,2');
    });

    test('throws after exhausting retries on persistent empty responses', async () => {
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            return new Response('', { status: 200 });
        }) as typeof fetch;

        await expect(downloadCsv('https://example.com/data.csv', 3, 0)).rejects.toThrow(
            'Failed to download CSV from https://example.com/data.csv after 3 attempts'
        );
        expect(calls).toBe(3);
    });
});
