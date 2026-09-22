import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, Check, X, Search, CheckSquare, Square, MinusSquare } from 'lucide-react';

interface ExcelMultiSelectFilterProps {
  id?: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
  placeholder?: string;
  optionLabels?: Record<string, string>;
}

export const ExcelMultiSelectFilter: React.FC<ExcelMultiSelectFilterProps> = ({
  id = 'excel-multi-filter',
  label,
  options,
  selectedValues,
  onChange,
  counts = {},
  placeholder = 'Cari...',
  optionLabels,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filtered options based on search term inside popover
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const labelText = optionLabels?.[opt] || opt;
      return opt.toLowerCase().includes(term) || labelText.toLowerCase().includes(term);
    });
  }, [options, searchTerm, optionLabels]);

  // Are all options currently selected?
  const allSelected = useMemo(() => {
    if (options.length === 0) return false;
    return options.every((opt) => selectedValues.includes(opt));
  }, [options, selectedValues]);

  // Are some (but not all) options selected?
  const isIndeterminate = useMemo(() => {
    const selectedCount = options.filter((opt) => selectedValues.includes(opt)).length;
    return selectedCount > 0 && selectedCount < options.length;
  }, [options, selectedValues]);

  // Toggle single option
  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  // Toggle "Select All"
  const handleToggleSelectAll = () => {
    if (allSelected) {
      // Uncheck all
      onChange([]);
    } else {
      // Check all available options
      onChange([...options]);
    }
  };

  const handleSelectAllVisible = () => {
    const combined = Array.from(new Set([...selectedValues, ...filteredOptions]));
    onChange(combined);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Button summary text
  const buttonSummary = useMemo(() => {
    if (selectedValues.length === 0) {
      return 'Tidak Ada Dipilih (0)';
    }
    if (allSelected || selectedValues.length >= options.length) {
      return `Semua (${options.length})`;
    }
    if (selectedValues.length === 1) {
      const singleKey = selectedValues[0];
      return optionLabels?.[singleKey] || singleKey;
    }
    return `${selectedValues.length} Dipilih`;
  }, [selectedValues, options.length, allSelected, optionLabels]);

  const isFiltered = !allSelected && selectedValues.length < options.length;

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
        <span>{label}</span>
        {isFiltered && (
          <span className="text-[10px] text-amber-600 font-extrabold normal-case bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
            Filter Aktif
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
          isFiltered
            ? 'bg-amber-50/70 border-amber-400 text-slate-900 ring-1 ring-amber-400/50'
            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center space-x-2 truncate">
          <Filter
            className={`w-3.5 h-3.5 shrink-0 ${
              isFiltered ? 'text-amber-600' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{buttonSummary}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Excel Style Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100">
          {/* Popover Header with Search Box */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Select All Checkbox like Excel */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isIndeterminate;
                    }
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer accent-amber-500"
                />
                <span>(Pilih Semua)</span>
              </label>

              <span className="text-[11px] font-medium text-slate-400">
                {selectedValues.length}/{options.length} Dipilih
              </span>
            </div>
          </div>

          {/* Options Checklist Body */}
          <div className="max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Tidak ada data yang cocok dengan "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt);
                const count = counts[opt];

                return (
                  <label
                    key={opt}
                    className="flex items-center justify-between px-2.5 py-1.5 hover:bg-amber-50/60 rounded-lg cursor-pointer transition-colors group select-none"
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleOption(opt)}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer accent-amber-500"
                      />
                      <span
                        className={`text-xs truncate ${
                          isChecked
                            ? 'font-bold text-slate-900'
                            : 'font-medium text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {optionLabels?.[opt] || opt}
                      </span>
                    </div>

                    {count !== undefined && (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-900 px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Popover Footer with Quick Actions */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded transition-colors"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
              >
                Kosongkan
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              Terapkan ({selectedValues.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
