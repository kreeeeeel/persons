import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ContentText } from '@persons/person-domain/ContentText';
import { TagDictionaryContext } from '@persons/person-domain/tags/TagDictionaryContext';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each([
    ['ru', 'Игра с друзьями'],
    ['en', 'A game with friends'],
] as const)('renders safe tags and a translated explanation in %s', async (locale, description) => {
    renderUi(
        <TagDictionaryContext
            value={{
                definitions: [{ tag: 'dota', descriptions: { ru: 'Игра с друзьями', en: 'A game with friends' } }],
                loading: false,
            }}
        >
            <ContentText text={'Вечером #Dota и #свои\n<script>alert(1)</script>'} />
        </TagDictionaryContext>,
        locale,
    );
    expect(screen.getByText('#свои')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
    const tag = screen.getByRole('button', { name: /Dota/ });
    fireEvent.click(tag);
    expect(await screen.findByText(description)).toBeVisible();
});

it('keeps tag text visible when no definition exists', () => {
    renderUi(<ContentText text="Текст #нет_в_справочнике" />);
    expect(screen.getByText('#нет_в_справочнике')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
