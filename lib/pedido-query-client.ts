export type FilterValue =
  | { type: "fk"; ids: number[] }
  | { type: "text"; value: string }
  | { type: "number"; min?: number; max?: number }
  | { type: "date"; from?: string; to?: string };

export type FiltersState = Record<string, FilterValue>;

export function isFilterActive(f: FilterValue | undefined): boolean {
  if (!f) return false;
  switch (f.type) {
    case "fk":
      return f.ids.length > 0;
    case "text":
      return f.value.trim().length > 0;
    case "number":
      return f.min !== undefined || f.max !== undefined;
    case "date":
      return Boolean(f.from || f.to);
  }
}

export function anyFilterActive(filters: FiltersState, quickSearch: string): boolean {
  if (quickSearch.trim().length > 0) return true;
  return Object.values(filters).some(isFilterActive);
}

export interface QueryOptions {
  filters: FiltersState;
  quickSearch: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
}

export function buildPedidosQueryParams(opts: QueryOptions): URLSearchParams {
  const params = new URLSearchParams();

  for (const [fieldKey, filter] of Object.entries(opts.filters)) {
    if (!isFilterActive(filter)) continue;
    if (filter.type === "fk") {
      params.set(`f_${fieldKey}`, filter.ids.join(","));
    } else if (filter.type === "text") {
      params.set(`f_${fieldKey}`, filter.value.trim());
    } else if (filter.type === "number") {
      if (filter.min !== undefined) params.set(`f_${fieldKey}_min`, String(filter.min));
      if (filter.max !== undefined) params.set(`f_${fieldKey}_max`, String(filter.max));
    } else if (filter.type === "date") {
      if (filter.from) params.set(`f_${fieldKey}_from`, filter.from);
      if (filter.to) params.set(`f_${fieldKey}_to`, filter.to);
    }
  }

  if (opts.quickSearch.trim()) params.set("q", opts.quickSearch.trim());
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.dir) params.set("dir", opts.dir);
  if (opts.page) params.set("page", String(opts.page));

  return params;
}
