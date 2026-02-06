"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MarketGrid, MarketFilters, MarketFiltersState } from "@/components/markets";
import { useMarkets } from "@/hooks/use-markets";

export default function MarketsPage() {
  const { markets, isLoading, filters, updateFilters, clearFilters } = useMarkets();

  const handleFiltersChange = (newFilters: MarketFiltersState) => {
    updateFilters({
      category: newFilters.category === "all" ? null : newFilters.category,
      status: newFilters.status === "all" ? null : newFilters.status,
      resolutionType: newFilters.resolutionType === "all" ? null : newFilters.resolutionType,
      search: newFilters.search,
    });
  };

  const filtersState: MarketFiltersState = {
    category: filters.category || "all",
    status: filters.status || "all",
    resolutionType: filters.resolutionType || "all",
    search: filters.search,
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
              filters={filtersState}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Market Grid */}
          <MarketGrid markets={markets} loading={isLoading} />

          {/* No results message */}
          {!isLoading && markets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No markets found matching your filters.</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-[#BFFF00] hover:text-[#BFFF00]/80 transition-colors"
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
