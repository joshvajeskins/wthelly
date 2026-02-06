"use client";

import { useState, useMemo } from "react";
import { useOnChainMarkets } from "./use-market-events";
import { toFrontendMarket } from "@/lib/market-adapter";
import { Market, MarketCategory, MarketStatus, ResolutionType } from "@/types";

export interface MarketFilters {
  category?: MarketCategory | null;
  status?: MarketStatus | null;
  resolutionType?: ResolutionType | null;
  search?: string;
}

export interface UseMarketsOptions {
  initialFilters?: MarketFilters;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const [filters, setFilters] = useState<MarketFilters>(
    options.initialFilters || {}
  );
  const { markets: onChainMarkets, isLoading } = useOnChainMarkets();

  const allMarkets = useMemo(() => {
    return onChainMarkets.map(toFrontendMarket);
  }, [onChainMarkets]);

  const markets = useMemo(() => {
    let filtered = [...allMarkets];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((m) => m.category === filters.category);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((m) => m.status === filters.status);
    }

    // Filter by resolution type
    if (filters.resolutionType) {
      filtered = filtered.filter((m) => m.resolutionType === filters.resolutionType);
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
  }, [allMarkets, filters]);

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
    totalCount: allMarkets.length,
    filteredCount: markets.length,
  };
}

export function useMarket(id: string) {
  const { markets: onChainMarkets, isLoading } = useOnChainMarkets();

  const market = useMemo(() => {
    const onChain = onChainMarkets.find(
      (m) => m.id.toLowerCase() === id.toLowerCase()
    );
    return onChain ? toFrontendMarket(onChain) : undefined;
  }, [onChainMarkets, id]);

  return {
    market,
    isLoading,
    error: !isLoading && !market ? "Market not found" : null,
  };
}
