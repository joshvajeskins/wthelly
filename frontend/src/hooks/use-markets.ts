"use client";

import { useState, useMemo } from "react";
import { mockMarkets } from "@/lib/mock-data";
import { Market, MarketCategory, MarketStatus, MarketType } from "@/types";

export interface MarketFilters {
  category?: MarketCategory | null;
  status?: MarketStatus | null;
  type?: MarketType | null;
  search?: string;
}

export interface UseMarketsOptions {
  initialFilters?: MarketFilters;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const [filters, setFilters] = useState<MarketFilters>(
    options.initialFilters || {}
  );
  const [isLoading] = useState(false);

  const markets = useMemo(() => {
    let filtered = [...mockMarkets];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((m) => m.category === filters.category);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((m) => m.status === filters.status);
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((m) => m.type === filters.type);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.question.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [filters]);

  const updateFilters = (newFilters: Partial<MarketFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    markets,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    totalCount: mockMarkets.length,
    filteredCount: markets.length,
  };
}

export function useMarket(id: string) {
  const market = useMemo(() => {
    return mockMarkets.find((m) => m.id === id);
  }, [id]);

  return {
    market,
    isLoading: false,
    error: market ? null : "Market not found",
  };
}
