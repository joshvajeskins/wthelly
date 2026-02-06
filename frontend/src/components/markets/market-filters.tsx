"use client";

import { useState } from "react";
import {
  MarketCategory,
  MarketStatus,
  ResolutionType,
  SortOption,
} from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface MarketFiltersState {
  category?: MarketCategory | "all";
  status?: MarketStatus | "all";
  resolutionType?: ResolutionType | "all";
  search?: string;
  sort?: SortOption;
}

interface MarketFiltersProps {
  filters: MarketFiltersState;
  onFiltersChange: (filters: MarketFiltersState) => void;
  className?: string;
}

const categories: Array<{ value: MarketCategory | "all"; label: string }> = [
  { value: "all", label: "All Categories" },
  { value: "crypto", label: "Crypto" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

const statuses: Array<{ value: MarketStatus | "all"; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "resolved", label: "Resolved" },
  { value: "settled", label: "Settled" },
];

const resolutionTypes: Array<{ value: ResolutionType | "all"; label: string }> = [
  { value: "all", label: "all types" },
  { value: "price", label: "price market" },
  { value: "admin", label: "admin resolved" },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest First" },
  { value: "deadline", label: "Ending Soon" },
  { value: "popular", label: "Most Popular" },
];

export function MarketFilters({
  filters,
  onFiltersChange,
  className,
}: MarketFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const hasActiveFilters =
    (filters.category && filters.category !== "all") ||
    (filters.status && filters.status !== "all") ||
    (filters.resolutionType && filters.resolutionType !== "all") ||
    filters.search;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleClearFilters = () => {
    setSearchValue("");
    onFiltersChange({
      category: "all",
      status: "all",
      resolutionType: "all",
      search: undefined,
      sort: filters.sort || "newest",
    });
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search markets..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchValue && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category Filter */}
        <Select
          value={filters.category || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              category: value === "all" ? undefined : (value as MarketCategory),
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === "all" ? undefined : (value as MarketStatus),
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resolution Type Filter */}
        <Select
          value={filters.resolutionType || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              resolutionType: value === "all" ? undefined : (value as ResolutionType),
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="type" />
          </SelectTrigger>
          <SelectContent>
            {resolutionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select
          value={filters.sort || "newest"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              sort: value as SortOption,
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px] sm:ml-auto">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="default"
            onClick={handleClearFilters}
            className="w-full sm:w-auto"
          >
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
