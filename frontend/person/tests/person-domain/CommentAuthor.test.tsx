import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommentAuthor } from '@persons/person-domain/CommentAuthor';
import { renderUi } from '@test/render';

vi.mock('@persons/ui/useImageState', () => ({ useImageState: () => ({ ready: true }) }));
afterEach(cleanup);

it('uses the account avatar and updates existing author content when identity changes', () => {
    const initial = {
        authorName: 'Старое имя',
        authorTag: 'krel',
        authorAvatarMediaId: 'persona-avatar',
        authorAvatarUrl: '/api/person/v1/authors/account/avatar?v=1',
    };
    const { rerender, container } = renderUi(<CommentAuthor comment={initial} />);
    const original = container.querySelector('img');
    expect(original).toHaveAttribute('src', initial.authorAvatarUrl);
    rerender(
        <CommentAuthor
            comment={{
                ...initial,
                authorName: 'Система',
                authorAvatarUrl: '/api/person/v1/authors/account/avatar?v=2',
            }}
        />,
    );
    expect(screen.getByRole('link', { name: 'Система' })).toHaveAttribute('href', '/krel');
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/person/v1/authors/account/avatar?v=2');
    expect(screen.queryByText('Старое имя')).not.toBeInTheDocument();
});

it('makes an unlinked media author actionable without linking to somebody else', () => {
    renderUi(<CommentAuthor comment={{ authorName: 'Автор без страницы' }} interactive />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Автор без страницы' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('У этого пользователя пока нет связанной страницы.');
});
