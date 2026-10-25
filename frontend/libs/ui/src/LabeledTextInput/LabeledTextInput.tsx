'use client';

import { useId } from 'react';
import { Flex, Text, TextInput } from '@gravity-ui/uikit';
import type { LabeledTextInputProps } from '@persons/ui/LabeledTextInput/LabeledTextInput.types';

export function LabeledTextInput({ label, id, ...props }: LabeledTextInputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const caption = label ?? props.controlProps?.['aria-label'];
    return (
        <Flex direction="column" gap="2">
            {caption && (
                <Text as="label" htmlFor={inputId}>
                    {caption}
                </Text>
            )}
            <TextInput {...props} id={inputId} />
        </Flex>
    );
}
