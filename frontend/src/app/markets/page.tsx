"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MarketGrid, MarketFilters, MarketFiltersState } from "@/components/markets";
import { mockMarkets } from "@/lib/mock-data";

export default function MarketsPage() {
  const [filters, setFilters] = useState<MarketFiltersState>({});

  // Filter markets based on selected filters
  const filteredMarkets = useMemo(() => {
    return mockMarkets.filter((market) => {
      // Category filter
      if (filters.category && filters.category !== "all" && market.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status !== "all" && market.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type && filters.type !== "all" && market.type !== filters.type) {
        return false;
      }

      // Search query filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesQuestion = market.question.toLowerCase().includes(query);
        const matchesDescription = market.description?.toLowerCase().includes(query);
        if (!matchesQuestion && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 pb-24 md:pb-8">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Markets</h1>
            <p className="text-muted-foreground text-lg">Find your next bet fr fr</p>
          </div>

          {/* Filters Section */}
          <div className="mb-8">
            <MarketFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Market Grid */}
          <MarketGrid markets={filteredMarkets} />

          {/* No results message */}
          {filteredMarkets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No markets found matching your filters.</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-cyan hover:text-cyan/80 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
