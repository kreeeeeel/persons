import { expect, it } from 'vitest';
import { dotaRankImage, dotaRankStars } from '@/modules/integrations/model/dotaRankImage';

it('renders the rank medal and its exact star level for provider and preview rank labels', () => {
    expect(dotaRankImage('Legend IV')).toMatch(/rank-5.png$/);
    expect(dotaRankStars('Legend IV')).toMatch(/stars-4.png$/);
    expect(dotaRankStars('legend4')).toMatch(/stars-4.png$/);
    expect(dotaRankImage('Immortal')).toMatch(/rank-8.png$/);
    expect(dotaRankStars('Immortal')).toBeUndefined();
    expect(dotaRankImage()).toMatch(/rank-0.png$/);
});
