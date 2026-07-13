"use client";

import type { MaintenancePart } from "@/lib/workflow-validation";

interface PartsEditorProps {
  parts: MaintenancePart[];
  onChange: (parts: MaintenancePart[]) => void;
  disabled?: boolean;
}

export function PartsEditor({ parts, onChange, disabled = false }: PartsEditorProps) {
  function updatePart(index: number, field: keyof MaintenancePart, value: string) {
    onChange(
      parts.map((part, partIndex) =>
        partIndex === index ? { ...part, [field]: value } : part
      )
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
          Parts
        </span>
        <button
          type="button"
          onClick={() => onChange([...parts, { name: "", partNumber: "" }])}
          disabled={disabled || parts.length >= 50}
          className="font-narrow uppercase tracking-wider text-[0.6rem] text-iron hover:text-iron-lt disabled:opacity-50"
        >
          + Add part
        </button>
      </div>

      {parts.length === 0 ? (
        <p className="text-xs text-galv-dim">No parts listed.</p>
      ) : (
        <div className="space-y-2">
          {parts.map((part, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-2">
              <label className="sr-only" htmlFor={`part-name-${index}`}>
                Part name
              </label>
              <input
                id={`part-name-${index}`}
                type="text"
                value={part.name}
                onChange={(event) => updatePart(index, "name", event.target.value)}
                disabled={disabled}
                placeholder="Part name"
                maxLength={120}
                className="min-w-0 bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              />
              <label className="sr-only" htmlFor={`part-number-${index}`}>
                Part number
              </label>
              <input
                id={`part-number-${index}`}
                type="text"
                value={part.partNumber || ""}
                onChange={(event) =>
                  updatePart(index, "partNumber", event.target.value)
                }
                disabled={disabled}
                placeholder="Part no."
                maxLength={120}
                className="min-w-0 bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChange(parts.filter((_, partIndex) => partIndex !== index))}
                disabled={disabled}
                aria-label={`Remove ${part.name || "part"}`}
                title="Remove part"
                className="w-9 text-galv-dim hover:text-iron border border-line rounded-md disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
