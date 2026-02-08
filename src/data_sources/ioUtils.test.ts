import { describe, test, expect } from 'bun:test';
import { parseDelimited } from './ioUtils';

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
});
