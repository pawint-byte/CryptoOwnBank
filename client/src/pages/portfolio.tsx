import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AllocationChart } from "@/components/allocation-chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Trash2, Search, Filter, CheckCircle, Eye, EyeOff, Layers, BarChart3, ChevronDown, ChevronRight, ChevronUp, Plus, Lock, Pencil, Home, MapPin, Calendar, DollarSign, Building2, FileSearch, FileText, Coins, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAssetCategory, CATEGORY_COLORS, isStockOrETF } from "@shared/asset-categories";
import type { Position } from "@shared/schema";
import { OffChainHoldingsCard } from "@/components/off-chain-holdings";

type SectionKey = "crypto" | "real-estate" | "off-chain" | "bank-brokerage";
const COLLAPSED_SECTIONS_KEY = "portfolio-collapsed-sections-v1";

interface PositionWithMarket extends Position {
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  source?: string;
  isImport?: boolean;
  isAddressed?: boolean;
  isWallet?: boolean;
}

interface PortfolioData {
  positions: PositionWithMarket[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  allocation: Array<{ name: string; value: number; color: string }>;
  cryptoValue?: number;
  propertyValue?: number;
  propertyCount?: number;
  statementValue?: number;
  statementSourceCount?: number;
}

interface PropertyEntry {
  id: number;
  address: string;
  city: string;
  stateProvince: string | null;
  country: string;
  zipCode: string | null;
  purchasePrice: string;
  purchaseDate: string;
  currentValue: string | null;
  appreciationPct: string | null;
  metroArea: string | null;
  indexSeriesId: string | null;
  notes: string | null;
  lastUpdated: string | null;
}

type ViewMode = "holdings" | "consolidated" | "category";

function EditPositionDialog({ position, onClose }: { position: PositionWithMarket; onClose: () => void }) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(parseFloat(position.quantity).toString());
  const [averageCost, setAverageCost] = useState(position.averageCost ? parseFloat(position.averageCost).toString() : "0");
  const [totalCostBasis, setTotalCostBasis] = useState(position.totalCostBasis ? parseFloat(position.totalCostBasis).toString() : "0");

  const isWalletPosition = !!position.isWallet;

  const editMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      if (isWalletPosition) {
        const promises: Promise<unknown>[] = [];
        if (updates.quantity) {
          promises.push(apiRequest("PATCH", `/api/wallet-balances/${position.id}/balance`, { newBalance: updates.quantity }));
        }
        if (updates.averageCost || updates.totalCostBasis) {
          promises.push(apiRequest("PATCH", `/api/wallet-balances/${position.id}/cost`, {
            averageCost: updates.averageCost,
            totalCostBasis: updates.totalCostBasis,
          }));
        }
        await Promise.all(promises);
        return;
      }
      return apiRequest("PATCH", `/api/positions/${position.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: `Updated ${position.assetSymbol}` });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const updates: Record<string, string> = {};
    const newQty = parseFloat(quantity);
    const newAvg = parseFloat(averageCost);
    const newCost = parseFloat(totalCostBasis);
    if (!isNaN(newQty) && newQty.toString() !== parseFloat(position.quantity).toString()) updates.quantity = newQty.toString();
    if (!isNaN(newAvg) && newAvg.toString() !== (position.averageCost ? parseFloat(position.averageCost).toString() : "0")) updates.averageCost = newAvg.toString();
    if (!isNaN(newCost) && newCost.toString() !== (position.totalCostBasis ? parseFloat(position.totalCostBasis).toString() : "0")) updates.totalCostBasis = newCost.toString();
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    editMutation.mutate(updates);
  };

  return (
    <DialogContent className="sm:max-w-md" data-testid="dialog-edit-position">
      <DialogHeader>
        <DialogTitle>Edit {position.assetSymbol} Position</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Quantity</Label>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            data-testid="input-edit-quantity"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Average Cost (per unit)</Label>
          <Input
            type="number"
            step="any"
            value={averageCost}
            onChange={(e) => setAverageCost(e.target.value)}
            data-testid="input-edit-avg-cost"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Total Cost Basis ($)</Label>
          <Input
            type="number"
            step="any"
            value={totalCostBasis}
            onChange={(e) => setTotalCostBasis(e.target.value)}
            data-testid="input-edit-cost-basis"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">Cancel</Button>
          <Button onClick={handleSave} disabled={editMutation.isPending} data-testid="button-save-position">
            {editMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export default function Portfolio() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("holdings");
  const [showAddressed, setShowAddressed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSED_SECTIONS_KEY) : null;
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? (arr as SectionKey[]) : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(Array.from(collapsedSections))); } catch {}
  }, [collapsedSections]);
  const toggleSection = (key: SectionKey) => setCollapsedSections(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const isCollapsed = (key: SectionKey) => collapsedSections.has(key);
  const scrollToSection = (key: SectionKey) => {
    if (collapsedSections.has(key)) {
      setCollapsedSections(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
    setTimeout(() => {
      const el = document.getElementById(`section-${key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };
  const [editingPosition, setEditingPosition] = useState<PositionWithMarket | null>(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    assetSymbol: "",
    quantity: "",
    costPerUnit: "",
    currentPrice: "",
    location: "",
  });

  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const { data: dbPositions = [] } = useQuery<PositionWithMarket[]>({
    queryKey: ["/api/positions"],
  });

  const { data: propertiesData = [] } = useQuery<PropertyEntry[]>({
    queryKey: ["/api/properties"],
  });

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    address: "",
    city: "",
    stateProvince: "",
    country: "US",
    zipCode: "",
    purchasePrice: "",
    purchaseDate: "",
    notes: "",
  });

  const addPropertyMutation = useMutation({
    mutationFn: (form: typeof propertyForm) =>
      apiRequest("POST", "/api/properties", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setPropertyOpen(false);
      setPropertyForm({ address: "", city: "", stateProvince: "", country: "US", zipCode: "", purchasePrice: "", purchaseDate: "", notes: "" });
      toast({ title: "Property added", description: "Your property has been added and will auto-update based on regional housing data." });
    },
    onError: () => toast({ title: "Error", description: "Failed to add property", variant: "destructive" }),
  });

  const deletePropertyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Property removed" });
    },
  });

  const { data: userWallets = [] } = useQuery<Array<{ id: string; label: string | null; chain: string }>>({
    queryKey: ["/api/wallets"],
  });

  const existingLocations = useMemo(() => {
    const labels = new Set<string>();
    userWallets.forEach(w => {
      if (w.label) labels.add(w.label);
    });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [userWallets]);

  const filteredLocations = useMemo(() => {
    const search = manualForm.location.toLowerCase().trim();
    if (!search) return existingLocations;
    return existingLocations.filter(l => l.toLowerCase().includes(search));
  }, [existingLocations, manualForm.location]);

  const { data: subLimits } = useQuery<{ tier: string; portfolioSearch: boolean }>({
    queryKey: ["/api/subscription/limits"],
  });
  const canSearch = subLimits?.portfolioSearch !== false;
  const isPaidTier = subLimits?.tier === "premium" || subLimits?.tier === "pro";

  const downloadStatement = async () => {
    setDownloadingStatement(true);
    try {
      const res = await fetch("/api/portfolio/statement", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to generate statement" }));
        if (err.code === "PROFILE_INCOMPLETE") {
          if (confirm(err.message + "\n\nGo to Settings now?")) {
            window.location.href = "/settings";
          }
          return;
        }
        throw new Error(err.message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CryptoOwnBank-Statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Statement Error", description: err.message || "Failed to generate statement", variant: "destructive" });
    } finally {
      setDownloadingStatement(false);
    }
  };

  const allPositions = useMemo(() => {
    return data?.positions || dbPositions;
  }, [data?.positions, dbPositions]);

  const deletePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const res = await apiRequest("DELETE", `/api/positions/${positionId}`);
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: result.message });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove position", description: error.message, variant: "destructive" });
    },
  });

  const cleanupNonCryptoMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest("POST", "/api/positions/bulk-remove-non-crypto", { dryRun });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.dryRun) {
        const symbols = result.symbols.map((s: any) => s.symbol).join(", ");
        if (confirm(`Remove ${result.count} non-crypto positions?\n\n${symbols}\n\nClick OK to proceed.`)) {
          cleanupNonCryptoMutation.mutate(false);
        }
      } else {
        toast({ title: `Removed ${result.removed} non-crypto positions` });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Cleanup failed", description: error.message, variant: "destructive" });
    },
  });

  const addressMutation = useMutation({
    mutationFn: async ({ id, addressed }: { id: string; addressed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/positions/${id}/addressed`, { addressed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Position updated" });
    },
    onError: () => {
      toast({ title: "Failed to update position", variant: "destructive" });
    },
  });

  const manualEntryMutation = useMutation({
    mutationFn: async (data: typeof manualForm) => {
      const res = await apiRequest("POST", "/api/wallets/manual", {
        label: data.location || "Manual Entry",
        assetSymbol: data.assetSymbol,
        balance: data.quantity,
        costPerUnit: data.costPerUnit || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Entry added to portfolio & wallets" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lot-summary"] });
      setManualOpen(false);
      setLocationOpen(false);
      setManualForm({ assetSymbol: "", quantity: "", costPerUnit: "", currentPrice: "", location: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add entry", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const activePositions = useMemo(() => {
    return allPositions.filter(p => !p.isAddressed);
  }, [allPositions]);

  const addressedPositions = useMemo(() => {
    return allPositions.filter(p => p.isAddressed);
  }, [allPositions]);

  const displayPositions = showAddressed ? allPositions : activePositions;

  const uniqueSources = useMemo(() => {
    return [...new Set(displayPositions.map(p => p.source).filter(Boolean))] as string[];
  }, [displayPositions]);

  const filtered = useMemo(() => {
    let result = displayPositions.filter(p => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!p.assetSymbol.toLowerCase().includes(term) && !(p.source || "").toLowerCase().includes(term)) {
          return false;
        }
      }
      if (sourceFilter !== "all") {
        if (sourceFilter === "imports" && !p.isImport) return false;
        if (sourceFilter === "exchanges" && (p.isImport || p.isWallet)) return false;
        if (sourceFilter === "wallets" && !p.isWallet) return false;
        if (sourceFilter !== "imports" && sourceFilter !== "exchanges" && sourceFilter !== "wallets" && p.source !== sourceFilter) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.assetSymbol.localeCompare(b.assetSymbol);
        if (cmp !== 0) return cmp;
        return (a.isImport ? 1 : 0) - (b.isImport ? 1 : 0);
      }
      if (sortBy === "value") return (b.currentValue || 0) - (a.currentValue || 0);
      if (sortBy === "gainloss") return (b.gainLoss || 0) - (a.gainLoss || 0);
      if (sortBy === "quantity") return parseFloat(b.quantity) - parseFloat(a.quantity);
      return 0;
    });

    return result;
  }, [displayPositions, searchTerm, sourceFilter, sortBy]);

  const cryptoFiltered = useMemo(() => filtered.filter(p => !isStockOrETF(p.assetSymbol)), [filtered]);
  const stockFiltered = useMemo(() => filtered.filter(p => isStockOrETF(p.assetSymbol)), [filtered]);

  const stockTotalValue = useMemo(() => stockFiltered.reduce((sum, p) => sum + (p.currentValue || 0), 0), [stockFiltered]);
  const stockTotalCostBasis = useMemo(() => stockFiltered.reduce((sum, p) => sum + parseFloat(p.totalCostBasis), 0), [stockFiltered]);

  const consolidated = useMemo(() => {
    const map = new Map<string, {
      symbol: string;
      totalQty: number;
      totalCostBasis: number;
      totalValue: number;
      sources: string[];
      positions: PositionWithMarket[];
    }>();

    for (const p of cryptoFiltered) {
      if (p.isAddressed) continue;
      const sym = p.assetSymbol;
      const existing = map.get(sym) || { symbol: sym, totalQty: 0, totalCostBasis: 0, totalValue: 0, sources: [], positions: [] };
      existing.totalQty += parseFloat(p.quantity);
      existing.totalCostBasis += parseFloat(p.totalCostBasis);
      existing.totalValue += (p.currentValue || 0);
      if (p.source && !existing.sources.includes(p.source)) {
        existing.sources.push(p.source);
      }
      existing.positions.push(p);
      map.set(sym, existing);
    }

    return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
  }, [cryptoFiltered]);

  const categoryData = useMemo(() => {
    const map = new Map<string, {
      category: string;
      totalValue: number;
      totalCostBasis: number;
      assets: Array<{ symbol: string; value: number; qty: number; costBasis: number }>;
    }>();

    for (const p of cryptoFiltered) {
      if (p.isAddressed) continue;
      const cat = getAssetCategory(p.assetSymbol);
      const existing = map.get(cat) || { category: cat, totalValue: 0, totalCostBasis: 0, assets: [] };
      existing.totalValue += (p.currentValue || 0);
      existing.totalCostBasis += parseFloat(p.totalCostBasis);
      const existingAsset = existing.assets.find(a => a.symbol === p.assetSymbol);
      if (existingAsset) {
        existingAsset.value += (p.currentValue || 0);
        existingAsset.qty += parseFloat(p.quantity);
        existingAsset.costBasis += parseFloat(p.totalCostBasis);
      } else {
        existing.assets.push({
          symbol: p.assetSymbol,
          value: p.currentValue || 0,
          qty: parseFloat(p.quantity),
          costBasis: parseFloat(p.totalCostBasis),
        });
      }
      map.set(cat, existing);
    }

    return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
  }, [cryptoFiltered]);

  const categoryAllocation = useMemo(() => {
    return categoryData.map(c => ({
      name: c.category,
      value: c.totalValue,
      color: CATEGORY_COLORS[c.category] || CATEGORY_COLORS["Other"],
    }));
  }, [categoryData]);

  const symbolCounts = new Map<string, number>();
  cryptoFiltered.forEach(p => symbolCounts.set(p.assetSymbol, (symbolCounts.get(p.assetSymbol) || 0) + 1));
  const duplicateSymbols = new Set<string>();
  symbolCounts.forEach((count, symbol) => { if (count > 1) duplicateSymbols.add(symbol); });

  const toggleGroup = (symbol: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalPortfolioValue = categoryData.reduce((sum, c) => sum + c.totalValue, 0) || data?.totalValue || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-portfolio">Portfolio</h1>
          <p className="text-muted-foreground text-sm">
            Your complete portfolio — crypto, real estate, and everything you own
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {addressedPositions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddressed(!showAddressed)}
              className="text-xs"
              data-testid="button-toggle-addressed"
            >
              {showAddressed ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
              <span className="hidden sm:inline">{showAddressed ? "Hide" : "Show"} Addressed</span>
              <span className="sm:hidden">{addressedPositions.length}</span>
              <span className="hidden sm:inline"> ({addressedPositions.length})</span>
            </Button>
          )}
          {subLimits?.tier === "pro" && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => cleanupNonCryptoMutation.mutate(true)}
              disabled={cleanupNonCryptoMutation.isPending}
              data-testid="button-cleanup-non-crypto"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove Non-Crypto
            </Button>
          )}
          {isPaidTier && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadStatement}
              disabled={downloadingStatement}
              className="text-xs"
              data-testid="button-download-statement-portfolio"
            >
              <FileText className={`h-3.5 w-3.5 mr-1.5 ${downloadingStatement ? "animate-pulse" : ""}`} />
              {downloadingStatement ? "Generating..." : "Statement"}
            </Button>
          )}
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-manual">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Entry</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  manualEntryMutation.mutate(manualForm);
                }}
                className="space-y-4"
                data-testid="form-manual-entry"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetSymbol">Asset Symbol *</Label>
                    <Input
                      id="assetSymbol"
                      placeholder="BTC, XRP, ETH..."
                      value={manualForm.assetSymbol}
                      onChange={(e) => setManualForm(f => ({ ...f, assetSymbol: e.target.value }))}
                      required
                      data-testid="input-manual-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="10"
                      value={manualForm.quantity}
                      onChange={(e) => setManualForm(f => ({ ...f, quantity: e.target.value }))}
                      required
                      data-testid="input-manual-quantity"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPerUnit">Cost Per Unit ($)</Label>
                  <Input
                    id="costPerUnit"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={manualForm.costPerUnit}
                    onChange={(e) => setManualForm(f => ({ ...f, costPerUnit: e.target.value }))}
                    data-testid="input-manual-cost"
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, a tax lot will be created for cost basis tracking.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Where It's Held *</Label>
                  <div className="relative" ref={locationRef}>
                    <Input
                      id="location"
                      placeholder="Crypto.com, Coinbase, Cold Storage..."
                      value={manualForm.location}
                      onChange={(e) => {
                        setManualForm(f => ({ ...f, location: e.target.value }));
                        setLocationOpen(true);
                      }}
                      onFocus={() => setLocationOpen(true)}
                      autoComplete="off"
                      required
                      data-testid="input-manual-location"
                    />
                    {locationOpen && filteredLocations.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto" data-testid="location-suggestions">
                        {filteredLocations.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              setManualForm(f => ({ ...f, location: loc }));
                              setLocationOpen(false);
                            }}
                            data-testid={`location-option-${loc}`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pick an existing wallet or type a new name. Shows in both Portfolio and Wallets & Addresses.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={manualEntryMutation.isPending}
                  data-testid="button-submit-manual"
                >
                  {manualEntryMutation.isPending ? "Adding..." : "Add to Portfolio"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold font-mono" data-testid="text-total-value">
              {formatCurrency(data?.totalValue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Cost Basis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold font-mono" data-testid="text-cost-basis">
              {formatCurrency(data?.totalCostBasis || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Unrealized Gain/Loss
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div
              className={cn(
                "text-lg sm:text-2xl font-bold font-mono",
                (data?.totalGainLoss || 0) > 0 && "text-chart-2",
                (data?.totalGainLoss || 0) < 0 && "text-destructive"
              )}
              data-testid="text-gain-loss"
            >
              {formatCurrency(data?.totalGainLoss || 0)}
              <span className="text-xs sm:text-sm ml-2">
                ({(data?.totalGainLossPercent || 0).toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b"
        data-testid="portfolio-jump-nav"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1 hidden sm:inline">
            Jump to
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => scrollToSection("crypto")}
            data-testid="jump-crypto"
          >
            <Coins className="h-3.5 w-3.5 mr-1" />
            Crypto
            <span className="ml-1 text-muted-foreground">({cryptoFiltered.length})</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => scrollToSection("real-estate")}
            data-testid="jump-real-estate"
          >
            <Home className="h-3.5 w-3.5 mr-1" />
            Real Estate
            <span className="ml-1 text-muted-foreground">({propertiesData.length})</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => scrollToSection("off-chain")}
            data-testid="jump-off-chain"
          >
            <Briefcase className="h-3.5 w-3.5 mr-1" />
            Off-Chain
          </Button>
          {(data?.statementValue ?? 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => scrollToSection("bank-brokerage")}
              data-testid="jump-bank-brokerage"
            >
              <Building2 className="h-3.5 w-3.5 mr-1" />
              Bank
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-muted-foreground"
            onClick={() => {
              const allKeys: SectionKey[] = ["crypto", "real-estate", "off-chain", "bank-brokerage"];
              const allCollapsed = allKeys.every(k => collapsedSections.has(k));
              setCollapsedSections(allCollapsed ? new Set() : new Set(allKeys));
            }}
            data-testid="button-toggle-all-sections"
          >
            {(["crypto","real-estate","off-chain","bank-brokerage"] as SectionKey[]).every(k => collapsedSections.has(k))
              ? "Expand all" : "Collapse all"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3" id="section-crypto" style={{ scrollMarginTop: 64 }}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 -ml-2"
                onClick={() => toggleSection("crypto")}
                data-testid="button-collapse-crypto"
                aria-expanded={!isCollapsed("crypto")}
              >
                {isCollapsed("crypto") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="ml-1.5 font-semibold text-sm flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" /> Crypto Holdings
                </span>
              </Button>
              {isCollapsed("crypto") && (
                <span className="ml-auto text-xs text-muted-foreground font-mono" data-testid="text-crypto-summary">
                  {cryptoFiltered.length} {cryptoFiltered.length === 1 ? "asset" : "assets"} · {formatCurrency(data?.totalValue || 0)}
                </span>
              )}
            </div>
            {!isCollapsed("crypto") && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "holdings" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("holdings")}
                  data-testid="button-view-holdings"
                >
                  Holdings
                </Button>
                <Button
                  variant={viewMode === "consolidated" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("consolidated")}
                  data-testid="button-view-consolidated"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  By Asset
                </Button>
                <Button
                  variant={viewMode === "category" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("category")}
                  data-testid="button-view-category"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  By Category
                </Button>
              </div>
              {canSearch ? (
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 w-40 pl-8 text-sm"
                      data-testid="input-search-portfolio"
                    />
                  </div>
                  {viewMode === "holdings" && (
                    <>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-9 w-36 text-sm" data-testid="select-source-filter">
                          <Filter className="h-3.5 w-3.5 mr-1.5" />
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="imports">Imports Only</SelectItem>
                          <SelectItem value="exchanges">Exchanges Only</SelectItem>
                          <SelectItem value="wallets">Wallets Only</SelectItem>
                          {uniqueSources.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-9 w-32 text-sm" data-testid="select-sort-by">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">By Name</SelectItem>
                          <SelectItem value="value">By Value</SelectItem>
                          <SelectItem value="gainloss">By Gain/Loss</SelectItem>
                          <SelectItem value="quantity">By Quantity</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">Search, filter & sort are Premium features</span>
                  <a href="/settings" className="text-xs font-medium text-amber-600 hover:underline" data-testid="link-upgrade-portfolio">Upgrade</a>
                </div>
              )}
            </div>
            )}
          </CardHeader>
          {!isCollapsed("crypto") && (
          <CardContent>
            {viewMode === "holdings" && (
              <>
                {cryptoFiltered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium">
                      {searchTerm || sourceFilter !== "all" ? "No matching holdings" : "No holdings yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || sourceFilter !== "all" ? "Try adjusting your search or filter." : "Add transactions to see your portfolio here."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {cryptoFiltered.map((position, idx) => {
                      const isDupe = duplicateSymbols.has(position.assetSymbol);
                      const isFirstOfGroup = sortBy === "name" && (idx === 0 || cryptoFiltered[idx - 1].assetSymbol !== position.assetSymbol);
                      const isAddr = position.isAddressed;
                      const isGroupCollapsed = isDupe && sortBy === "name" && collapsedGroups.has(position.assetSymbol);

                      if (isGroupCollapsed && !isFirstOfGroup) return null;
                      const hideRow = isGroupCollapsed && isFirstOfGroup;

                      const groupTotal = isDupe && isFirstOfGroup
                        ? cryptoFiltered.filter(p => p.assetSymbol === position.assetSymbol).reduce((sum, p) => sum + (p.currentValue || 0), 0)
                        : 0;
                      const groupCount = isDupe && isFirstOfGroup
                        ? symbolCounts.get(position.assetSymbol) || 0
                        : 0;

                      return (
                        <div key={position.id}>
                          {isDupe && isFirstOfGroup && (
                            <div
                              className="flex items-center gap-2 mt-3 mb-1 px-2 cursor-pointer select-none group"
                              onClick={() => toggleGroup(position.assetSymbol)}
                              data-testid={`group-header-${position.assetSymbol}`}
                            >
                              {collapsedGroups.has(position.assetSymbol)
                                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              }
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">{position.assetSymbol}</span>
                              <div className="flex-1 h-px bg-border" />
                              {collapsedGroups.has(position.assetSymbol) && (
                                <span className="text-xs font-mono font-medium text-muted-foreground">{formatCurrency(groupTotal)}</span>
                              )}
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                {collapsedGroups.has(position.assetSymbol) ? `${groupCount} sources` : "Multiple sources"}
                              </span>
                            </div>
                          )}
                          {!hideRow && (
                            <div
                              className={cn(
                                "p-3 sm:p-4 rounded-lg border",
                                isAddr && "opacity-50 bg-muted/30",
                                !isAddr && isDupe && position.isImport && "border-l-4 border-l-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10",
                                !isAddr && isDupe && !position.isImport && "border-l-4 border-l-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/10"
                              )}
                              data-testid={`position-${position.assetSymbol}-${position.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                  <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] sm:text-sm font-bold text-primary">
                                      {position.assetSymbol.slice(0, 2)}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-sm sm:text-base">{position.assetSymbol}</span>
                                      {position.source && (
                                        <Badge variant={position.isImport ? "secondary" : "default"} className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                                          {position.source}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground hidden sm:inline-flex">
                                        {getAssetCategory(position.assetSymbol)}
                                      </Badge>
                                      {isAddr && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          Addressed
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                                      <span className="sm:hidden">{parseFloat(position.quantity).toFixed(2)} units</span>
                                      <span className="hidden sm:inline">{parseFloat(position.quantity).toFixed(4)} units</span>
                                      {position.source && <span className="sm:hidden text-[10px] ml-1 text-muted-foreground/70">· {position.source}</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                                  <div className="text-right">
                                    <div className="font-mono font-medium text-xs sm:text-base whitespace-nowrap">
                                      {formatCurrency(position.currentValue || 0)}
                                    </div>
                                    <div
                                      className={cn(
                                        "flex items-center justify-end gap-1 text-xs sm:text-sm",
                                        (position.gainLossPercent || 0) > 0 && "text-chart-2",
                                        (position.gainLossPercent || 0) < 0 && "text-destructive",
                                        (position.gainLossPercent || 0) === 0 && "text-muted-foreground"
                                      )}
                                    >
                                      {(position.gainLossPercent || 0) > 0 && <TrendingUp className="h-3 w-3" />}
                                      {(position.gainLossPercent || 0) < 0 && <TrendingDown className="h-3 w-3" />}
                                      {(position.gainLossPercent || 0) === 0 && <Minus className="h-3 w-3" />}
                                      <span>
                                        {(position.gainLossPercent || 0) > 0 && "+"}
                                        {(position.gainLossPercent || 0).toFixed(2)}%
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-primary"
                                    onClick={() => setEditingPosition(position)}
                                    data-testid={`button-edit-position-${position.id}`}
                                    title={`Edit ${position.assetSymbol} quantity/cost`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {!position.isWallet && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(isAddr ? "text-chart-2 hover:text-chart-2" : "text-muted-foreground hover:text-amber-600")}
                                      onClick={() => addressMutation.mutate({ id: position.id, addressed: !isAddr })}
                                      disabled={addressMutation.isPending}
                                      data-testid={`button-address-${position.id}`}
                                      title={isAddr ? "Restore position" : "Mark as addressed"}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {position.isImport && !position.isWallet && !isAddr && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-destructive"
                                      onClick={() => deletePositionMutation.mutate(position.id)}
                                      disabled={deletePositionMutation.isPending}
                                      data-testid={`button-delete-position-${position.assetSymbol}`}
                                      title={`Remove ${position.assetSymbol} from ${position.source}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {viewMode === "consolidated" && (
              <div className="space-y-2">
                {consolidated.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No holdings to consolidate.</p>
                ) : (
                  consolidated.map(item => {
                    const avgCost = item.totalQty > 0 ? item.totalCostBasis / item.totalQty : 0;
                    const gainLoss = item.totalValue - item.totalCostBasis;
                    const gainPct = item.totalCostBasis > 0 ? (gainLoss / item.totalCostBasis) * 100 : 0;
                    const pctOfPortfolio = totalPortfolioValue > 0 ? (item.totalValue / totalPortfolioValue) * 100 : 0;

                    return (
                      <div key={item.symbol} className="p-3 sm:p-4 rounded-lg border" data-testid={`consolidated-${item.symbol}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] sm:text-sm font-bold text-primary">{item.symbol.slice(0, 2)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base">{item.symbol}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                                  {getAssetCategory(item.symbol)}
                                </Badge>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {pctOfPortfolio.toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                <span className="font-mono sm:hidden">{item.totalQty.toFixed(2)}</span>
                                <span className="font-mono hidden sm:inline">{item.totalQty.toFixed(4)}</span> units
                                {item.sources.length > 0 && (
                                  <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs hidden sm:inline">
                                    from {item.sources.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="font-mono font-medium text-xs sm:text-base whitespace-nowrap">{formatCurrency(item.totalValue)}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                              Avg: {formatCurrency(avgCost)} | Basis: {formatCurrency(item.totalCostBasis)}
                            </div>
                            <div className={cn("text-xs sm:text-sm", gainLoss > 0 ? "text-chart-2" : gainLoss < 0 ? "text-destructive" : "text-muted-foreground")}>
                              <span className="hidden sm:inline">{gainLoss > 0 ? "+" : ""}{formatCurrency(gainLoss)} </span>({gainPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {viewMode === "category" && (
              <div className="space-y-2">
                {categoryData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No holdings to categorize.</p>
                ) : (
                  categoryData.map(cat => {
                    const isExpanded = expandedCategories.has(cat.category);
                    const gainLoss = cat.totalValue - cat.totalCostBasis;
                    const gainPct = cat.totalCostBasis > 0 ? (gainLoss / cat.totalCostBasis) * 100 : 0;
                    const pctOfPortfolio = totalPortfolioValue > 0 ? (cat.totalValue / totalPortfolioValue) * 100 : 0;
                    const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS["Other"];

                    return (
                      <div key={cat.category} className="rounded-lg border overflow-hidden" data-testid={`category-${cat.category}`}>
                        <button
                          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => toggleCategory(cat.category)}
                          data-testid={`button-toggle-category-${cat.category}`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full" style={{ backgroundColor: color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base">{cat.category}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {cat.assets.length}
                                </Badge>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {pctOfPortfolio.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1 hidden sm:block" style={{ maxWidth: 200 }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pctOfPortfolio, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                            <div className="text-right">
                              <div className="font-mono font-medium text-xs sm:text-base whitespace-nowrap">{formatCurrency(cat.totalValue)}</div>
                              <div className={cn("text-xs sm:text-sm", gainLoss > 0 ? "text-chart-2" : gainLoss < 0 ? "text-destructive" : "text-muted-foreground")}>
                                {gainLoss > 0 ? "+" : ""}{gainPct.toFixed(2)}%
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t px-4 pb-3 bg-muted/20">
                            {cat.assets.sort((a, b) => b.value - a.value).map(asset => {
                              const assetGain = asset.value - asset.costBasis;
                              const assetPct = asset.costBasis > 0 ? (assetGain / asset.costBasis) * 100 : 0;
                              return (
                                <div key={asset.symbol} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border/50" data-testid={`category-asset-${asset.symbol}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium text-sm">{asset.symbol}</span>
                                    <span className="text-xs text-muted-foreground font-mono sm:hidden">{asset.qty.toFixed(2)}</span>
                                    <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{asset.qty.toFixed(4)}</span>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <span className="font-mono text-xs sm:text-sm whitespace-nowrap">{formatCurrency(asset.value)}</span>
                                    <span className={cn("text-xs ml-2", assetGain > 0 ? "text-chart-2" : assetGain < 0 ? "text-destructive" : "text-muted-foreground")}>
                                      {assetGain > 0 ? "+" : ""}{assetPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
          )}
        </Card>

        <div className="space-y-6">
          <AllocationChart
            data={viewMode === "category" ? categoryAllocation : (data?.allocation || [])}
            isLoading={isLoading}
          />
        </div>
      </div>

      {stockFiltered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              Stocks & ETFs
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Traditional investments tracked separately from crypto • {stockFiltered.length} position{stockFiltered.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stockFiltered.map((position) => {
                const gainLoss = position.gainLoss || 0;
                const gainLossPercent = position.gainLossPercent || 0;
                return (
                  <div
                    key={position.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    data-testid={`stock-row-${position.assetSymbol}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs font-bold text-yellow-700 dark:text-yellow-400 shrink-0">
                        {position.assetSymbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{position.assetSymbol}</p>
                        <p className="text-xs text-muted-foreground">{parseFloat(position.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(position.currentValue || 0)}</p>
                      <p className={cn("text-xs", gainLoss > 0 ? "text-green-600" : gainLoss < 0 ? "text-red-600" : "text-muted-foreground")}>
                        {gainLoss > 0 ? "+" : ""}{formatCurrency(gainLoss)} ({gainLossPercent > 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t flex justify-between text-sm">
              <span className="text-muted-foreground">Total Stocks & ETFs</span>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(stockTotalValue)}</span>
                <span className={cn("ml-2 text-xs", stockTotalValue - stockTotalCostBasis > 0 ? "text-green-600" : "text-red-600")}>
                  {stockTotalValue - stockTotalCostBasis > 0 ? "+" : ""}{formatCurrency(stockTotalValue - stockTotalCostBasis)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="section-real-estate" style={{ scrollMarginTop: 64 }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 -ml-1"
              onClick={() => toggleSection("real-estate")}
              data-testid="button-collapse-real-estate"
              aria-expanded={!isCollapsed("real-estate")}
            >
              {isCollapsed("real-estate") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-emerald-600" />
                Real Estate
                {isCollapsed("real-estate") && (
                  <span className="text-xs text-muted-foreground font-mono ml-2" data-testid="text-real-estate-summary">
                    {propertiesData.length} {propertiesData.length === 1 ? "property" : "properties"} · {formatCurrency(propertiesData.reduce((sum, p) => sum + parseFloat(p.currentValue || p.purchasePrice || "0"), 0))}
                  </span>
                )}
              </CardTitle>
              {!isCollapsed("real-estate") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Values auto-update using regional housing indices
                </p>
              )}
            </div>
          </div>
          <Dialog open={propertyOpen} onOpenChange={setPropertyOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-property">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addPropertyMutation.mutate(propertyForm);
                }}
                className="space-y-4"
                data-testid="form-add-property"
              >
                <div>
                  <Label>Street Address</Label>
                  <Input
                    placeholder="123 Maple Street"
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    required
                    data-testid="input-property-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      placeholder="Austin"
                      value={propertyForm.city}
                      onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                      required
                      data-testid="input-property-city"
                    />
                  </div>
                  <div>
                    <Label>State / Province</Label>
                    <Input
                      placeholder="TX"
                      value={propertyForm.stateProvince}
                      onChange={(e) => setPropertyForm({ ...propertyForm, stateProvince: e.target.value })}
                      data-testid="input-property-state"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Country</Label>
                    <Select
                      value={propertyForm.country}
                      onValueChange={(v) => setPropertyForm({ ...propertyForm, country: v })}
                    >
                      <SelectTrigger data-testid="select-property-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="GB">UK</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                        <SelectItem value="IE">Ireland</SelectItem>
                        <SelectItem value="ES">Spain</SelectItem>
                        <SelectItem value="IT">Italy</SelectItem>
                        <SelectItem value="JP">Japan</SelectItem>
                        <SelectItem value="SG">Singapore</SelectItem>
                        <SelectItem value="HK">Hong Kong</SelectItem>
                        <SelectItem value="NZ">New Zealand</SelectItem>
                        <SelectItem value="SE">Sweden</SelectItem>
                        <SelectItem value="NO">Norway</SelectItem>
                        <SelectItem value="CH">Switzerland</SelectItem>
                        <SelectItem value="AE">UAE</SelectItem>
                        <SelectItem value="IN">India</SelectItem>
                        <SelectItem value="BR">Brazil</SelectItem>
                        <SelectItem value="MX">Mexico</SelectItem>
                        <SelectItem value="ZA">South Africa</SelectItem>
                        <SelectItem value="KR">South Korea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Zip / Postal Code</Label>
                    <Input
                      placeholder="78701"
                      value={propertyForm.zipCode}
                      onChange={(e) => setPropertyForm({ ...propertyForm, zipCode: e.target.value })}
                      data-testid="input-property-zip"
                    />
                  </div>
                  <div>
                    <Label>Purchase Date</Label>
                    <Input
                      type="date"
                      value={propertyForm.purchaseDate}
                      onChange={(e) => setPropertyForm({ ...propertyForm, purchaseDate: e.target.value })}
                      required
                      data-testid="input-property-date"
                    />
                  </div>
                </div>
                <div>
                  <Label>Purchase Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="350000"
                    value={propertyForm.purchasePrice}
                    onChange={(e) => setPropertyForm({ ...propertyForm, purchasePrice: e.target.value })}
                    required
                    data-testid="input-property-price"
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g. Single-family home, 3BR/2BA"
                    value={propertyForm.notes}
                    onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })}
                    data-testid="input-property-notes"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addPropertyMutation.isPending} data-testid="button-submit-property">
                  {addPropertyMutation.isPending ? "Adding..." : "Add Property"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        {!isCollapsed("real-estate") && (
        <CardContent>
          {propertiesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-properties">
              <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No properties added yet</p>
              <p className="text-xs mt-1">Add your home, investment properties, or vacation homes to track their value</p>
            </div>
          ) : (
            <div className="space-y-3">
              {propertiesData.map((prop) => {
                const purchasePrice = parseFloat(prop.purchasePrice);
                const currentValue = parseFloat(prop.currentValue || prop.purchasePrice);
                const appreciation = parseFloat(prop.appreciationPct || "0");
                const gainLoss = currentValue - purchasePrice;

                return (
                  <div
                    key={prop.id}
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                    data-testid={`property-${prop.id}`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{prop.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {prop.city}{prop.stateProvince ? `, ${prop.stateProvince}` : ""} {prop.zipCode || ""}
                        </span>
                        {prop.metroArea && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {prop.metroArea} Index
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Purchased {new Date(prop.purchaseDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Paid {formatCurrency(purchasePrice)}
                        </span>
                      </div>
                      {prop.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">{prop.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4 space-y-1">
                      <div className="font-mono font-bold text-sm" data-testid={`property-value-${prop.id}`}>
                        {formatCurrency(currentValue)}
                      </div>
                      <div className={cn("text-xs font-medium", gainLoss > 0 ? "text-chart-2" : gainLoss < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {gainLoss > 0 ? "+" : ""}{formatCurrency(gainLoss)} ({appreciation > 0 ? "+" : ""}{appreciation.toFixed(1)}%)
                      </div>
                      {prop.lastUpdated && (
                        <p className="text-[10px] text-muted-foreground">
                          Updated {new Date(prop.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deletePropertyMutation.mutate(prop.id)}
                        data-testid={`button-delete-property-${prop.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t text-sm">
                <span className="text-muted-foreground">Total Real Estate Value</span>
                <span className="font-mono font-bold" data-testid="text-total-property-value">
                  {formatCurrency(propertiesData.reduce((sum, p) => sum + parseFloat(p.currentValue || p.purchasePrice), 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
        )}
      </Card>

      <div id="section-off-chain" style={{ scrollMarginTop: 64 }}>
        <OffChainHoldingsCard
          collapsed={isCollapsed("off-chain")}
          onToggleCollapsed={() => toggleSection("off-chain")}
        />
      </div>

      {(data?.statementValue ?? 0) > 0 && (
        <Card id="section-bank-brokerage" style={{ scrollMarginTop: 64 }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 -ml-1"
                onClick={() => toggleSection("bank-brokerage")}
                data-testid="button-collapse-bank-brokerage"
                aria-expanded={!isCollapsed("bank-brokerage")}
              >
                {isCollapsed("bank-brokerage") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Bank & Brokerage
                  {isCollapsed("bank-brokerage") && (
                    <span className="text-xs text-muted-foreground font-mono ml-2" data-testid="text-bank-summary">
                      {data?.statementSourceCount || 0} {(data?.statementSourceCount || 0) === 1 ? "source" : "sources"} · {formatCurrency(data?.statementValue || 0)}
                    </span>
                  )}
                </CardTitle>
                {!isCollapsed("bank-brokerage") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    From uploaded statements · {data?.statementSourceCount || 0} source{(data?.statementSourceCount || 0) !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            <Link href="/statement-insights">
              <Button size="sm" variant="outline" data-testid="button-manage-statements">
                <FileSearch className="h-3.5 w-3.5 mr-1.5" />
                Manage
              </Button>
            </Link>
          </CardHeader>
          {!isCollapsed("bank-brokerage") && (
          <CardContent>
            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <span className="text-muted-foreground">Total Bank & Brokerage Value</span>
              <span className="font-mono font-bold" data-testid="text-total-statement-value">
                {formatCurrency(data?.statementValue || 0)}
              </span>
            </div>
          </CardContent>
          )}
        </Card>
      )}

      <Dialog open={!!editingPosition} onOpenChange={(open) => { if (!open) setEditingPosition(null); }}>
        {editingPosition && (
          <EditPositionDialog position={editingPosition} onClose={() => setEditingPosition(null)} />
        )}
      </Dialog>
    </div>
  );
}
