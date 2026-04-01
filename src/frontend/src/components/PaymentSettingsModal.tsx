import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethodType = "iban" | "revolut" | "wise" | "zen";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  accountName: string;
  iban?: string;
  phoneOrTag?: string;
  bankName?: string;
  country: string;
}

// ─── Countries ────────────────────────────────────────────────────────────────

export const SUPPORTED_COUNTRIES = [
  { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "BY", flag: "🇧🇾", name: "Belarus" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "UA", flag: "🇺🇦", name: "Ukraine" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "CH", flag: "🇨🇭", name: "Switzerland" },
  { code: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "AT", flag: "🇦🇹", name: "Austria" },
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"];

// ─── Hook ─────────────────────────────────────────────────────────────────────

const METHODS_KEY = "anon_payment_methods";
const COUNTRIES_KEY = "anon_accepted_countries";

export function usePaymentSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(METHODS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const [acceptedCountries, setAcceptedCountries] = useState<CountryCode[]>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(COUNTRIES_KEY) ?? "[]");
      } catch {
        return [];
      }
    },
  );

  const saveMethods = (next: PaymentMethod[]) => {
    setMethods(next);
    localStorage.setItem(METHODS_KEY, JSON.stringify(next));
  };

  const saveCountries = (next: CountryCode[]) => {
    setAcceptedCountries(next);
    localStorage.setItem(COUNTRIES_KEY, JSON.stringify(next));
  };

  const addMethod = (m: Omit<PaymentMethod, "id">) => {
    const next = [...methods, { ...m, id: crypto.randomUUID() }];
    saveMethods(next);
  };

  const removeMethod = (id: string) => {
    saveMethods(methods.filter((m) => m.id !== id));
  };

  const toggleCountry = (code: CountryCode) => {
    const next = acceptedCountries.includes(code)
      ? acceptedCountries.filter((c) => c !== code)
      : [...acceptedCountries, code];
    saveCountries(next);
  };

  const selectAll = () =>
    saveCountries(SUPPORTED_COUNTRIES.map((c) => c.code as CountryCode));
  const clearAll = () => saveCountries([]);

  return {
    methods,
    acceptedCountries,
    addMethod,
    removeMethod,
    toggleCountry,
    selectAll,
    clearAll,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const METHOD_META: Record<
  PaymentMethodType,
  { icon: string; label: string; color: string }
> = {
  iban: { icon: "🏦", label: "IBAN (Bank Transfer)", color: "text-sky-400" },
  revolut: { icon: "🔵", label: "Revolut", color: "text-blue-400" },
  wise: { icon: "💚", label: "Wise", color: "text-emerald-400" },
  zen: { icon: "⚡", label: "Zen", color: "text-yellow-400" },
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  type: "iban" as PaymentMethodType,
  accountName: "",
  iban: "",
  phoneOrTag: "",
  bankName: "",
  country: "NL",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PaymentSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentSettingsModal({
  open,
  onClose,
}: PaymentSettingsModalProps) {
  const {
    methods,
    acceptedCountries,
    addMethod,
    removeMethod,
    toggleCountry,
    selectAll,
    clearAll,
  } = usePaymentSettings();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const handleAdd = () => {
    if (!form.accountName.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (form.type === "iban" && !form.iban.trim()) {
      toast.error("IBAN is required for bank transfer");
      return;
    }
    if (
      (form.type === "revolut" ||
        form.type === "wise" ||
        form.type === "zen") &&
      !form.phoneOrTag.trim()
    ) {
      toast.error("Phone / @tag is required");
      return;
    }
    addMethod({
      type: form.type,
      accountName: form.accountName.trim(),
      iban: form.type === "iban" ? form.iban.trim() : undefined,
      phoneOrTag: form.type !== "iban" ? form.phoneOrTag.trim() : undefined,
      bankName: form.bankName.trim() || undefined,
      country: form.country,
    });
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    toast.success("Payment method added");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[92dvh] overflow-y-auto px-4 pb-10"
        data-ocid="payment_settings.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            💳 Payment Settings
          </SheetTitle>
        </SheetHeader>

        {/* ── Payment Methods Section ──────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Methods
            </h3>
            {!showForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="h-7 px-2.5 text-xs gap-1.5 border-white/10 bg-white/5 hover:bg-white/10"
                data-ocid="payment_settings.open_modal_button"
              >
                <Plus className="w-3 h-3" />
                Add Method
              </Button>
            )}
          </div>

          {/* Existing methods */}
          <div className="space-y-2 mb-3">
            {methods.length === 0 && !showForm && (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-white/10 rounded-xl">
                No payment methods yet. Add one to start selling.
              </p>
            )}
            {methods.map((m) => {
              const meta = METHOD_META[m.type];
              const country = SUPPORTED_COUNTRIES.find(
                (c) => c.code === m.country,
              );
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3"
                  data-ocid="payment_settings.item.1"
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn("text-xs font-bold", meta.color)}>
                        {meta.label}
                      </span>
                      {country && (
                        <span className="text-xs">
                          {country.flag} {country.code}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">
                      {m.accountName}
                    </p>
                    {m.iban && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {m.iban}
                      </p>
                    )}
                    {m.phoneOrTag && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.phoneOrTag}
                      </p>
                    )}
                    {m.bankName && (
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {m.bankName}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeMethod(m.id);
                      toast.success("Removed");
                    }}
                    className="h-7 w-7 p-0 text-red-400 hover:bg-red-900/20 flex-shrink-0"
                    data-ocid="payment_settings.delete_button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add form */}
          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  New Payment Method
                </span>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Type
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as PaymentMethodType }))
                  }
                >
                  <SelectTrigger
                    className="h-9 text-sm bg-white/5 border-white/10"
                    data-ocid="payment_settings.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {(
                      Object.entries(METHOD_META) as [
                        PaymentMethodType,
                        (typeof METHOD_META)[PaymentMethodType],
                      ][]
                    ).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.icon} {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account name */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Account Name *
                </Label>
                <Input
                  placeholder="Full name on account"
                  value={form.accountName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountName: e.target.value }))
                  }
                  className="h-9 text-sm bg-white/5 border-white/10"
                  data-ocid="payment_settings.input"
                />
              </div>

              {/* IBAN or phone/tag */}
              {form.type === "iban" ? (
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    IBAN *
                  </Label>
                  <Input
                    placeholder="LT91 3130 0101 3137 6235"
                    value={form.iban}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iban: e.target.value }))
                    }
                    className="h-9 text-sm bg-white/5 border-white/10 font-mono"
                    data-ocid="payment_settings.input"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Phone / @Tag *
                  </Label>
                  <Input
                    placeholder={
                      form.type === "revolut"
                        ? "@username or +44..."
                        : form.type === "wise"
                          ? "email or @tag"
                          : "@username"
                    }
                    value={form.phoneOrTag}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phoneOrTag: e.target.value }))
                    }
                    className="h-9 text-sm bg-white/5 border-white/10"
                    data-ocid="payment_settings.input"
                  />
                </div>
              )}

              {/* Bank name (optional) */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Bank Name (optional)
                </Label>
                <Input
                  placeholder="e.g. ING, Revolut, N26"
                  value={form.bankName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bankName: e.target.value }))
                  }
                  className="h-9 text-sm bg-white/5 border-white/10"
                  data-ocid="payment_settings.input"
                />
              </div>

              {/* Country */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Country
                </Label>
                <Select
                  value={form.country}
                  onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
                >
                  <SelectTrigger
                    className="h-9 text-sm bg-white/5 border-white/10"
                    data-ocid="payment_settings.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 max-h-[200px]">
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-10 bg-primary hover:bg-primary/90 font-semibold"
                onClick={handleAdd}
                data-ocid="payment_settings.submit_button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-white/5 mb-6" />

        {/* ── Accepted Countries Section ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accepted Countries
            </h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] text-primary hover:text-primary/80 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/10"
                data-ocid="payment_settings.button"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-white/10 bg-white/5"
                data-ocid="payment_settings.button"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60 mb-3">
            Buyers from these countries can see your listings.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_COUNTRIES.map((c) => {
              const selected = acceptedCountries.includes(
                c.code as CountryCode,
              );
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCountry(c.code as CountryCode)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left",
                    selected
                      ? "bg-primary/15 border-primary/40 text-foreground"
                      : "bg-white/3 border-white/8 text-muted-foreground hover:bg-white/8",
                  )}
                  data-ocid="payment_settings.toggle"
                >
                  <span className="text-lg">{c.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-none mb-0.5">
                      {c.code}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {c.name}
                    </p>
                  </div>
                  {selected && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {acceptedCountries.length > 0 && (
            <p className="text-[10px] text-primary/70 mt-3 text-center">
              ✓ {acceptedCountries.length} countries selected
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
