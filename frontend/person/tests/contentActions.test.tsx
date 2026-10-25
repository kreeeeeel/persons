import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContentActions } from '@persons/person-domain/ContentActions';
import { renderUi } from '@test/render';

afterEach(cleanup);

it('keeps icon actions accessible and removes content only after confirmation', () => {
    const edit = vi.fn();
    const remove = vi.fn();
    const view = renderUi(
        <ContentActions onEdit={edit} onRemove={remove}>
            {null}
        </ContentActions>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(edit).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('dialog', { name: 'Удалить публикацию?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Удалить' }));
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Редактировать')).not.toBeInTheDocument();
    view.unmount();
    renderUi(
        <ContentActions pending onEdit={edit} onRemove={remove}>
            {null}
        </ContentActions>,
    );
    expect(screen.getByRole('button', { name: 'Редактировать' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled();
});

it.each([
    ['ru', 'Удалить', 'Удалить публикацию?', 'Отмена'],
    ['en', 'Remove', 'Remove this publication?', 'Cancel'],
] as const)('cancels removal without invoking the mutation in %s', (locale, removeLabel, title, cancel) => {
    const remove = vi.fn();
    renderUi(<ContentActions onRemove={remove}>{null}</ContentActions>, locale);
    fireEvent.click(screen.getByRole('button', { name: removeLabel }));
    const confirmation = screen.getByRole('dialog', { name: title });
    fireEvent.click(within(confirmation).getByRole('button', { name: cancel }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('blocks confirmation and cancellation when a mutation becomes pending', () => {
    const remove = vi.fn();
    const view = renderUi(<ContentActions onRemove={remove}>{null}</ContentActions>);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    view.rerender(
        <ContentActions pending onRemove={remove}>
            {null}
        </ContentActions>,
    );
    const confirmation = screen.getByRole('dialog', { name: 'Удалить публикацию?' });
    const confirm = within(confirmation).getByRole('button', { name: 'Удалить' });
    expect(confirm).toBeDisabled();
    expect(within(confirmation).getByRole('button', { name: 'Отмена' })).toBeDisabled();
    fireEvent.click(confirm);
    fireEvent.keyDown(confirmation, { key: 'Escape', code: 'Escape' });
    expect(remove).not.toHaveBeenCalled();
    expect(confirmation).toBeInTheDocument();
});
