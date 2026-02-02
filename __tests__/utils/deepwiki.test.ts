import { describe, it, expect } from 'vitest';
import { queryDeepWiki } from '../../src/utils/deepwiki';

describe('DeepWiki Integration Test', () => {
    it('should get real response from DeepWiki for G2 question', async () => {
        // Set timeout to 120s as this is a real network request

        try {
            const result = await queryDeepWiki({
                repoName: 'antvis/G2',
                question: '如何调整折线图两端的间隔',
            });

            console.log('DeepWiki Answer:', result);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(10);
            // Basic check to see if it returned something relevant or at least not an error string
            expect(result).not.toMatch(/^Error/);
        } catch (error) {
            console.error('DeepWiki Query Failed:', error);
            throw error;
        }
    }, 120000);
});
