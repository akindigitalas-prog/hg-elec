'use client';

import { useRef } from 'react';

export function AutoSectionSelect({
  action,
  options,
  defaultValue,
  disabled,
  name = 'section_id',
  itemId,
  parentId,
  parentField,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: Array<{ id: string; name: string }>;
  defaultValue?: string | null;
  disabled?: boolean;
  name?: string;
  itemId: string;
  parentId: string;
  parentField: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name={parentField} value={parentId} />
      <input type="hidden" name="item_id" value={itemId} />
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-2xl border border-input bg-background px-2 py-1 text-sm"
        disabled={disabled}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.id || 'general'} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </form>
  );
}
