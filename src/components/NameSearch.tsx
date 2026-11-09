import { useMemo, useState } from 'preact/hooks';
import type { IndexRow } from '../data/types';
import { formatNumber } from '../lib/labels';
import { createSearch } from '../lib/search';
import { t } from '../strings';

// Preact's typings tie role="combobox" on an input to a <datalist>; this uses a custom listbox.
const COMBOBOX = { role: 'combobox' } as Record<string, string>;

interface Props {
  index: IndexRow[];
  onSelect: (name: string) => void;
  /** Text shown in the box when a name is already selected. */
  selected?: string;
}

export function NameSearch({ index, onSelect, selected = '' }: Props) {
  const search = useMemo(() => createSearch(index), [index]);
  const [text, setText] = useState(selected);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [lastSelected, setLastSelected] = useState(selected);
  // Follow the selection when it changes from outside (surprise button, back button, shared link).
  if (selected !== lastSelected) {
    setLastSelected(selected);
    setText(selected);
  }
  const suggestions = open ? search.suggest(text) : [];

  function choose(name: string) {
    setText(name);
    setOpen(false);
    setActive(-1);
    onSelect(name);
  }

  function submit() {
    const row = suggestions[active] ?? search.find(text) ?? search.suggest(text, 1)[0];
    if (row) choose(row[0]);
    else if (text.trim()) choose(text.trim()); // shows the "not found" message
  }

  return (
    <form
      class="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label for="name-search">{t.search.label}</label>
      <div class="search-box">
        <input
          id="name-search"
          type="search"
          {...COMBOBOX}
          autocomplete="off"
          aria-expanded={suggestions.length > 0}
          aria-controls="name-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
          placeholder={t.search.placeholder}
          value={text}
          onInput={(e) => {
            setText((e.target as HTMLInputElement).value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === 'Escape') {
              setOpen(false);
              setActive(-1);
            }
          }}
        />
        <button type="submit">{t.search.go}</button>
        {suggestions.length > 0 && (
          <ul id="name-suggestions" role="listbox" aria-label={t.search.suggestions}>
            {suggestions.map((row, i) => (
              <li
                key={row[0]}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the input
                  choose(row[0]);
                }}
              >
                <span>{row[0]}</span>
                <small>{formatNumber(row[1])}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
