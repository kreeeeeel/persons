import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FilePicker } from '@persons/person-domain/FilePicker';
import { renderUi } from '@test/render';

afterEach(cleanup);
it('uses a custom choose button and returns the selected proof file', () => {
    const onChange = vi.fn();
    const file = new File(['proof'], 'proof.png', { type: 'image/png' });
    renderUi(<FilePicker label="Доказательство" accept="image/png" file={file} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Выбрать файл' })).toBeVisible();
    expect(screen.getByText('proof.png')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Доказательство'), { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
});
