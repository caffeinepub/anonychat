import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Flame,
  Gem,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  P2PListing,
  P2PTrade,
  SellerStats,
  TradeMessage,
  TradeReview,
} from "../backend.d";
import { useActor } from "../hooks/useActor";

// ─── Types ────────────────────────────────────────────────────────────────────

type P2PTab = "market" | "listings" | "trades";
type RarityFilter = "all" | "normal" | "rare" | "ultra";
type FakeBuyStep = 1 | 2 | 3 | 4 | 5 | 6;
type RealBuyStep = 1 | 2 | 3 | 4 | 5 | 6;
type Rarity = "normal" | "rare" | "ultra";
type SellerKind = "user" | "admin";
type ListingStatusKind = "Active" | "Locked" | "Sold" | "Cancelled";
type TradeStatusKind =
  | "Pending"
  | "PaymentSent"
  | "Confirmed"
  | "Rejected"
  | "Disputed"
  | "Cancelled";

// ICP SDK returns variants as { Active: null }, not { __kind__: 'Active' }
const vk = (s: unknown): string =>
  (s && typeof s === "object" ? Object.keys(s)[0] : String(s)) ?? "";

type PaymentMethodId = "iban" | "revolut" | "wise" | "zen";

interface FakeListing {
  id: string;
  anonId: string;
  price: number;
  rarity: Rarity;
  sellerType: SellerKind;
  sellerIban: string;
  sellerName: string;
  rating: number;
  tradeCount: number;
  tags: string[];
  nextDropMs?: number;
  paymentMethods: PaymentMethodId[];
  acceptedCountries: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_IBAN = "LT913130010131376235";
const BASE_TIME = Date.now(); // stable session base for drop countdowns

const FAKE_LISTINGS: FakeListing[] = [
  {
    id: "fake-1",
    anonId: "+777 4839 9281",
    price: 10,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 00",
    sellerName: "User#4829",
    rating: 4.6,
    tradeCount: 23,
    tags: [],
    paymentMethods: ["iban"],
    acceptedCountries: ["TR", "DE"],
  },
  {
    id: "fake-2",
    anonId: "+777 1234 5678",
    price: 15,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 01",
    sellerName: "User#7731",
    rating: 4.7,
    tradeCount: 11,
    tags: [],
    paymentMethods: ["iban"],
    acceptedCountries: ["DE", "AT", "CH"],
  },
  {
    id: "fake-3",
    anonId: "+777 8821 3344",
    price: 20,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 02",
    sellerName: "User#2091",
    rating: 4.5,
    tradeCount: 8,
    tags: [],
    paymentMethods: ["iban", "revolut"],
    acceptedCountries: ["GB", "NL", "BE"],
  },
  {
    id: "fake-4",
    anonId: "+777 2222 3333",
    price: 45,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 03",
    sellerName: "User#6612",
    rating: 4.9,
    tradeCount: 47,
    tags: ["Limited"],
    paymentMethods: ["revolut", "wise"],
    acceptedCountries: ["GB", "NL", "BE", "FR"],
  },
  {
    id: "fake-5",
    anonId: "+777 5555 1111",
    price: 55,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 04",
    sellerName: "User#3310",
    rating: 4.8,
    tradeCount: 31,
    tags: ["Limited"],
    paymentMethods: ["iban", "wise"],
    acceptedCountries: ["PL", "UA", "DE"],
  },
  {
    id: "fake-6",
    anonId: "+777 7000 0001",
    price: 65,
    rarity: "rare",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Limited"],
    paymentMethods: ["iban", "revolut", "wise"],
    acceptedCountries: ["NL", "DE", "TR", "GB", "RU", "BY", "FR", "IT"],
  },
  {
    id: "fake-7",
    anonId: "+777 8888 0001",
    price: 80,
    rarity: "rare",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Limited"],
    paymentMethods: ["iban", "revolut", "wise", "zen"],
    acceptedCountries: [
      "NL",
      "DE",
      "TR",
      "GB",
      "RU",
      "BY",
      "FR",
      "IT",
      "ES",
      "PL",
    ],
  },
  {
    id: "fake-8",
    anonId: "+777 9999 0000",
    price: 120,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: BASE_TIME + 3_600_000,
    paymentMethods: ["iban", "revolut", "wise"],
    acceptedCountries: ["NL", "DE", "TR", "GB", "RU", "BY", "FR", "IT"],
  },
  {
    id: "fake-9",
    anonId: "+777 1111 1111",
    price: 150,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: BASE_TIME + 7_200_000,
    paymentMethods: ["iban", "revolut", "wise", "zen"],
    acceptedCountries: [
      "NL",
      "DE",
      "TR",
      "GB",
      "RU",
      "BY",
      "FR",
      "IT",
      "ES",
      "PL",
      "UA",
    ],
  },
  {
    id: "fake-10",
    anonId: "+777 7777 7777",
    price: 200,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: BASE_TIME + 10_800_000,
    paymentMethods: ["iban", "revolut", "wise", "zen"],
    acceptedCountries: [
      "NL",
      "DE",
      "TR",
      "GB",
      "RU",
      "BY",
      "FR",
      "IT",
      "ES",
      "PL",
      "UA",
      "SE",
      "NO",
      "CH",
      "BE",
      "AT",
    ],
  },
  {
    id: "fake-11",
    anonId: "+777 3333 9999",
    price: 35,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 05",
    sellerName: "User#9021",
    rating: 4.6,
    tradeCount: 5,
    tags: [],
    paymentMethods: ["iban"],
    acceptedCountries: ["TR"],
  },
  {
    id: "fake-12",
    anonId: "+777 6600 4422",
    price: 90,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 06",
    sellerName: "User#5544",
    rating: 4.7,
    tradeCount: 19,
    tags: ["Limited"],
    paymentMethods: ["revolut", "zen"],
    acceptedCountries: ["GB", "NL", "SE", "NO"],
  },
];

const ACTIVITY_MESSAGES = [
  "🔥 +777 7777 7777 sold for €120",
  "⚡ New rare ID listed",
  "👤 User bought ID",
  "💎 Ultra ID drop in 1 hour",
  "🔥 +777 2222 3333 sold for €45",
  "⚡ Admin listed new Official ID",
  "👤 User #4829 completed trade",
  "💎 +777 9999 0000 unlocked soon",
];

// ─── Payment Method & Country helpers ─────────────────────────────────────────

const PAYMENT_META: Record<
  string,
  { icon: string; label: string; colorCls: string; bgCls: string }
> = {
  iban: {
    icon: "🏦",
    label: "IBAN",
    colorCls: "text-sky-400",
    bgCls: "bg-sky-500/15 border-sky-500/30",
  },
  revolut: {
    icon: "🔵",
    label: "Revolut",
    colorCls: "text-blue-400",
    bgCls: "bg-blue-500/15 border-blue-500/30",
  },
  wise: {
    icon: "💚",
    label: "Wise",
    colorCls: "text-emerald-400",
    bgCls: "bg-emerald-500/15 border-emerald-500/30",
  },
  zen: {
    icon: "⚡",
    label: "Zen",
    colorCls: "text-yellow-400",
    bgCls: "bg-yellow-500/15 border-yellow-500/30",
  },
};

const COUNTRY_FLAGS: Record<string, string> = {
  NL: "🇳🇱",
  DE: "🇩🇪",
  TR: "🇹🇷",
  GB: "🇬🇧",
  RU: "🇷🇺",
  BY: "🇧🇾",
  FR: "🇫🇷",
  IT: "🇮🇹",
  ES: "🇪🇸",
  PL: "🇵🇱",
  UA: "🇺🇦",
  SE: "🇸🇪",
  NO: "🇳🇴",
  CH: "🇨🇭",
  BE: "🇧🇪",
  AT: "🇦🇹",
};

const BUYER_COUNTRIES = [
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
];

function PaymentMethodBadges({ methods }: { methods: string[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {methods.map((m) => {
        const meta = PAYMENT_META[m];
        if (!meta) return null;
        return (
          <span
            key={m}
            className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
              meta.bgCls,
              meta.colorCls,
            )}
          >
            {meta.icon} {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function CountryChips({ countries }: { countries: string[] }) {
  if (countries.length === 0) return null;
  const shown = countries.slice(0, 5);
  const rest = countries.length - shown.length;
  return (
    <p className="text-[9px] text-muted-foreground/70">
      {shown.map((c) => `${COUNTRY_FLAGS[c] ?? ""}${c}`).join(" / ")}
      {rest > 0 && ` +${rest}`}
    </p>
  );
}

type TrustBadge = "fast" | "trusted" | "new";

function SellerTrustBadge({ badge }: { badge: TrustBadge }) {
  if (badge === "fast")
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
        ⚡ Fast
      </span>
    );
  if (badge === "trusted")
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        ✅ Trusted
      </span>
    );
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
      ⚠️ New
    </span>
  );
}

function getTrustBadge(listing: FakeListing, index: number): TrustBadge {
  if (listing.sellerType === "admin") return "trusted";
  if (listing.rarity === "ultra" || listing.rarity === "rare") return "trusted";
  // 30% fast, 20% new, rest trusted based on index
  const n = index % 10;
  if (n < 3) return "fast";
  if (n < 5) return "new";
  return "trusted";
}

function bestPaymentMethod(
  listing: FakeListing,
  _buyerCountry: string,
): string | null {
  if (listing.paymentMethods.length === 0) return null;
  // Priority order: iban > revolut > wise > zen
  const priority: PaymentMethodId[] = ["iban", "revolut", "wise", "zen"];
  for (const p of priority) {
    if (listing.paymentMethods.includes(p)) return p;
  }
  return listing.paymentMethods[0];
}

// ─── Smart matching filter ────────────────────────────────────────────────────

function matchesFilters(
  listing: FakeListing,
  buyerCountry: string,
  paymentFilter: string,
  sameCountry: boolean,
): boolean {
  // Country filter: if buyer country set, check if it's in acceptedCountries
  if (buyerCountry && listing.acceptedCountries.length > 0) {
    if (!listing.acceptedCountries.includes(buyerCountry)) return false;
  }
  // Same country only
  if (sameCountry && buyerCountry) {
    if (!listing.acceptedCountries.includes(buyerCountry)) return false;
  }
  // Payment filter
  if (paymentFilter !== "all") {
    if (!listing.paymentMethods.includes(paymentFilter as PaymentMethodId))
      return false;
  }
  return true;
}

const LISTING_STATUS_CFG: Record<
  ListingStatusKind,
  { label: string; cls: string }
> = {
  Active: {
    label: "Active",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  Locked: {
    label: "Locked",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  Sold: {
    label: "Sold",
    cls: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  Cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

const TRADE_STATUS_CFG: Record<
  TradeStatusKind,
  { label: string; cls: string }
> = {
  Pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  PaymentSent: {
    label: "Payment Sent",
    cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  Confirmed: {
    label: "Confirmed",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  Rejected: {
    label: "Rejected",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  Disputed: {
    label: "Disputed",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  Cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

function genRefCode(): string {
  return `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ─── Currencies & Banks ───────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "EUR", symbol: "€", rate: 1 },
  { code: "USD", symbol: "$", rate: 1.08 },
  { code: "GBP", symbol: "£", rate: 0.86 },
  { code: "TRY", symbol: "₺", rate: 35 },
  { code: "USDT", symbol: "₮", rate: 1.08 },
  { code: "BTC", symbol: "₿", rate: 0.000016 },
  { code: "ETH", symbol: "Ξ", rate: 0.00028 },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

function CurrencyChips({
  selected,
  onChange,
}: {
  selected: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
      {CURRENCIES.map((c) => (
        <button
          key={c.code}
          type="button"
          onClick={() => onChange(c.code)}
          className={cn(
            "flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
            selected === c.code
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
              : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25",
          )}
        >
          {c.symbol} {c.code}
        </button>
      ))}
    </div>
  );
}

const BANK_GROUPS = [
  {
    label: "🏦 Türk Bankaları",
    banks: [
      {
        id: "ziraat",
        name: "Ziraat Bankası",
        placeholder: "TR00 0001 0000 0000 0000 00",
      },
      {
        id: "garanti",
        name: "Garanti BBVA",
        placeholder: "TR00 0006 2000 0000 0000 00",
      },
      {
        id: "isbank",
        name: "İş Bankası",
        placeholder: "TR00 0006 4000 0000 0000 00",
      },
      {
        id: "akbank",
        name: "Akbank",
        placeholder: "TR00 0004 6000 0000 0000 00",
      },
      {
        id: "yapikredi",
        name: "Yapı Kredi",
        placeholder: "TR00 0006 7000 0000 0000 00",
      },
      {
        id: "halkbank",
        name: "Halkbank",
        placeholder: "TR00 0001 2000 0000 0000 00",
      },
      {
        id: "vakifbank",
        name: "Vakıfbank",
        placeholder: "TR00 0001 5000 0000 0000 00",
      },
      {
        id: "denizbank",
        name: "Denizbank",
        placeholder: "TR00 0013 4000 0000 0000 00",
      },
      { id: "teb", name: "TEB", placeholder: "TR00 0003 2000 0000 0000 00" },
      {
        id: "ing_tr",
        name: "ING Türkiye",
        placeholder: "TR00 0009 9800 0000 0000 00",
      },
      {
        id: "sekerbank",
        name: "Şekerbank",
        placeholder: "TR00 0005 9000 0000 0000 00",
      },
      {
        id: "qnb",
        name: "QNB Finansbank",
        placeholder: "TR00 0011 1000 0000 0000 00",
      },
      {
        id: "fibabanka",
        name: "Fibabanka",
        placeholder: "TR00 0010 3000 0000 0000 00",
      },
      {
        id: "odeabank",
        name: "Odeabank",
        placeholder: "TR00 0009 2000 0000 0000 00",
      },
      {
        id: "alternatif",
        name: "Alternatif Bank",
        placeholder: "TR00 0008 0000 0000 0000 00",
      },
      {
        id: "hsbc_tr",
        name: "HSBC Türkiye",
        placeholder: "TR00 0012 3000 0000 0000 00",
      },
      {
        id: "burgan",
        name: "Burgan Bank",
        placeholder: "TR00 0014 4000 0000 0000 00",
      },
    ],
  },
  {
    label: "🏦 Avrupa Bankaları",
    banks: [
      {
        id: "deutsche",
        name: "Deutsche Bank",
        placeholder: "DE00 1007 0024 0000 0000 00",
      },
      { id: "ing", name: "ING", placeholder: "NL00 INGB 0000 0000 00" },
      {
        id: "commerzbank",
        name: "Commerzbank",
        placeholder: "DE00 2004 0060 0000 0000 00",
      },
      {
        id: "socgen",
        name: "Société Générale",
        placeholder: "FR00 3000 3000 0000 0000 00",
      },
      {
        id: "bnp",
        name: "BNP Paribas",
        placeholder: "FR00 3000 4000 0000 0000 00",
      },
      {
        id: "santander",
        name: "Santander",
        placeholder: "ES00 0049 0000 0000 0000 00",
      },
      { id: "bbva", name: "BBVA", placeholder: "ES00 0182 0000 0000 0000 00" },
      {
        id: "unicredit",
        name: "UniCredit",
        placeholder: "IT00 X030 2801 2300 0000 0000 000",
      },
      {
        id: "rabobank",
        name: "Rabobank",
        placeholder: "NL00 RABO 0000 0000 00",
      },
      { id: "abn", name: "ABN AMRO", placeholder: "NL00 ABNA 0000 0000 00" },
      { id: "n26", name: "N26", placeholder: "DE00 1001 1001 2625 0000 00" },
      { id: "bunq", name: "Bunq", placeholder: "NL00 BUNQ 2025 0000 00" },
      {
        id: "monzo",
        name: "Monzo",
        placeholder: "GB00 MONZ 0000 0000 0000 00",
      },
      {
        id: "starling",
        name: "Starling Bank",
        placeholder: "GB00 SRLG 0000 0000 0000 00",
      },
      {
        id: "barclays",
        name: "Barclays",
        placeholder: "GB00 BARC 2000 0000 0000 00",
      },
      { id: "hsbc", name: "HSBC", placeholder: "GB00 HBUK 4000 0000 0000 00" },
      {
        id: "lloyds",
        name: "Lloyds",
        placeholder: "GB00 LOYD 3096 7000 0000 00",
      },
      {
        id: "natwest",
        name: "NatWest",
        placeholder: "GB00 NWBK 6000 0100 0000 00",
      },
    ],
  },
  {
    label: "🌍 Fintech / Uluslararası",
    banks: [
      { id: "revolut", name: "Revolut", placeholder: "@revolut-username" },
      { id: "wise", name: "Wise", placeholder: "email@wise.com veya +90..." },
      { id: "paypal", name: "PayPal", placeholder: "email@paypal.com" },
      { id: "zen", name: "Zen", placeholder: "@zen-username" },
      { id: "skrill", name: "Skrill", placeholder: "email@skrill.com" },
      { id: "neteller", name: "Neteller", placeholder: "email@neteller.com" },
      { id: "paysafecard", name: "Paysafecard", placeholder: "16-digit code" },
      {
        id: "westernunion",
        name: "Western Union",
        placeholder: "Receiver name + MTCN",
      },
      { id: "moneygram", name: "MoneyGram", placeholder: "Reference number" },
      { id: "remitly", name: "Remitly", placeholder: "email@remitly.com" },
      { id: "swift", name: "SWIFT/BIC", placeholder: "SWIFT code + account" },
    ],
  },
  {
    label: "💰 Kripto",
    banks: [
      {
        id: "usdt_trc20",
        name: "USDT (TRC20)",
        placeholder: "T... wallet address",
      },
      {
        id: "usdt_erc20",
        name: "USDT (ERC20)",
        placeholder: "0x... wallet address",
      },
      {
        id: "btc",
        name: "Bitcoin (BTC)",
        placeholder: "bc1... wallet address",
      },
      {
        id: "eth",
        name: "Ethereum (ETH)",
        placeholder: "0x... wallet address",
      },
      { id: "bnb", name: "BNB", placeholder: "bnb1... wallet address" },
      { id: "usdc", name: "USDC", placeholder: "0x... wallet address" },
    ],
  },
] as const;

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const innerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      innerTimeoutRef.current = setTimeout(() => {
        setIdx((prev) => (prev + 1) % ACTIVITY_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => {
      clearInterval(interval);
      if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current);
    };
  }, []);

  return (
    <div className="mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2.5 overflow-hidden">
      <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p
          className="text-xs text-muted-foreground truncate transition-all duration-300"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-6px)",
          }}
        >
          {ACTIVITY_MESSAGES[idx]}
        </p>
      </div>
      <span className="text-[9px] font-bold text-amber-400/60 flex-shrink-0 tracking-widest">
        LIVE
      </span>
    </div>
  );
}

// ─── RarityBadge ─────────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: Rarity }) {
  if (rarity === "ultra") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
        <Gem className="w-2.5 h-2.5" />
        Ultra 💎
      </span>
    );
  }
  if (rarity === "rare") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
        <Flame className="w-2.5 h-2.5" />
        Rare 🔥
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
      Normal
    </span>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      <Star className="w-2.5 h-2.5 fill-current" />
      <span className="text-[10px] font-semibold">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── KYC Trust System ─────────────────────────────────────────────────────────

function getKycLevel(tradeCount: number, isAdmin: boolean) {
  if (isAdmin || tradeCount >= 100)
    return {
      level: 3,
      label: "Onaylı Satıcı ✓",
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
    };
  if (tradeCount >= 20)
    return {
      level: 2,
      label: "Deneyimli",
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
    };
  if (tradeCount >= 5)
    return {
      level: 1,
      label: "Güvenilir",
      color: "text-blue-400",
      bg: "bg-blue-500/20",
    };
  return {
    level: 0,
    label: "Anonim",
    color: "text-zinc-400",
    bg: "bg-zinc-500/20",
  };
}

function KycBadge({
  tradeCount,
  isAdmin,
}: { tradeCount: number; isAdmin: boolean }) {
  const kyc = getKycLevel(tradeCount, isAdmin);
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${kyc.bg} ${kyc.color} border-current/20`}
    >
      {kyc.level === 3 ? (
        <ShieldCheck className="w-2.5 h-2.5" />
      ) : kyc.level >= 1 ? (
        <Shield className="w-2.5 h-2.5" />
      ) : null}
      {kyc.label}
    </span>
  );
}

// ─── TrustBar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {["Protected Trade", "Secure Transfer", "Verified System"].map(
        (label) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[9px] text-emerald-400/80 font-medium"
          >
            <Check className="w-2.5 h-2.5 text-emerald-400" />
            {label}
          </span>
        ),
      )}
    </div>
  );
}

// ─── TradeStatsPanel ──────────────────────────────────────────────────────────

function TradeStatsPanel() {
  return (
    <div className="mb-3 bg-gradient-to-r from-emerald-950/40 to-zinc-900/60 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <p className="text-xs font-bold text-foreground">
          Bu hafta 23 ID satıldı
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          ✅ 847 Başarılı
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25">
          ⚡ Ort. 8dk
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
          📊 96% Başarı
        </span>
      </div>
    </div>
  );
}

// ─── ListingStatusBadge ───────────────────────────────────────────────────────

function ListingStatusBadge({ kind }: { kind: ListingStatusKind }) {
  const { label, cls } = LISTING_STATUS_CFG[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── TradeStatusBadge ─────────────────────────────────────────────────────────

function TradeStatusBadge({ kind }: { kind: TradeStatusKind }) {
  const { label, cls } = TRADE_STATUS_CFG[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── UltraDropCountdown ───────────────────────────────────────────────────────

function UltraDropCountdown({
  nextDropMs,
  onUnlock,
}: { nextDropMs: number; onUnlock: () => void }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, nextDropMs - Date.now()),
  );
  const cbRef = useRef(onUnlock);
  cbRef.current = onUnlock;

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, nextDropMs - Date.now());
      setRemaining(r);
      if (r === 0) {
        cbRef.current();
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [nextDropMs]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);

  return (
    <div className="flex items-center gap-1.5 text-orange-400">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      <span className="text-xs font-mono font-bold tabular-nums">
        Next Drop: {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
        {String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

// ─── TradeCountdownTimer ──────────────────────────────────────────────────────

function TradeCountdownTimer({
  createdAtNs,
  onExpired,
}: {
  createdAtNs: bigint;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const cbRef = useRef(onExpired);
  cbRef.current = onExpired;

  useEffect(() => {
    const expiresAt = Number(createdAtNs / 1_000_000n) + 15 * 60 * 1000;
    const tick = () => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r === 0) cbRef.current?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAtNs]);

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1_000);
  const urgent = remaining > 0 && remaining < 5 * 60 * 1000;
  const expired = remaining === 0;

  return (
    <div className="flex items-center gap-1.5">
      <Clock
        className={cn(
          "w-3.5 h-3.5",
          expired ? "text-red-400" : urgent ? "text-amber-400" : "text-primary",
        )}
      />
      <span
        className={cn(
          "font-mono text-sm font-bold tabular-nums",
          expired
            ? "text-red-400"
            : urgent
              ? "text-amber-400 animate-pulse"
              : "text-primary",
        )}
      >
        {expired
          ? "EXPIRED"
          : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
      </span>
    </div>
  );
}

// ─── CopyBox ─────────────────────────────────────────────────────────────────

function CopyBox({
  value,
  label,
  adminLabel,
}: {
  value: string;
  label: string;
  adminLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {adminLabel && (
          <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
            {adminLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-3 py-2.5">
        <span className="font-mono text-sm text-primary flex-1 break-all leading-snug">
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── StepIndicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border",
              s <= current
                ? "bg-primary border-primary text-primary-foreground"
                : "border-white/20 text-muted-foreground",
            )}
          >
            {s < current ? <Check className="w-2.5 h-2.5" /> : s}
          </div>
          {s < total && (
            <div
              className={cn(
                "h-0.5 w-4 rounded-full transition-colors",
                s < current ? "bg-primary" : "bg-white/10",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FakeBuyFlowSheet ─────────────────────────────────────────────────────────

interface FakeBuyFlowSheetProps {
  open: boolean;
  onClose: () => void;
  listing: FakeListing | null;
  buyerCountry: string;
}

function FakeBuyFlowSheet({
  open,
  onClose,
  listing,
  buyerCountry,
}: FakeBuyFlowSheetProps) {
  const [step, setStep] = useState<FakeBuyStep>(1);
  const [refCode, setRefCode] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imagePreviewRef = useRef<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    if (open) {
      setStep(1);
      setRefCode(genRefCode());
      setSelectedCurrency("EUR");
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
      setImagePreview(null);
      imagePreviewRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const url = URL.createObjectURL(file);
    imagePreviewRef.current = url;
    setImagePreview(url);
  };

  const isAdminSeller = listing?.sellerType === "admin";

  const STEP_TITLES: Record<FakeBuyStep, string> = {
    1: "Confirm Purchase",
    2: "Payment Details",
    3: "Payment Confirmation",
    4: "Upload Proof",
    5: "Awaiting Confirmation",
    6: "Transfer Complete",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && step < 6 && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[92dvh] overflow-y-auto px-4 pb-10"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-4 h-4 text-primary" />
            {STEP_TITLES[step]}
          </SheetTitle>
        </SheetHeader>

        {step < 6 && <StepIndicator current={step} total={5} />}

        {/* ── Step 1: Confirm Purchase ──────────────────────────────────── */}
        {step === 1 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-center pb-1">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Anonymous ID for Sale
                </p>
                <span className="font-mono text-2xl font-bold text-primary tracking-wider glow-text">
                  {listing.anonId}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl font-bold text-emerald-400">
                  €{listing.price}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rarity</span>
                <RarityBadge rarity={listing.rarity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full border",
                    isAdminSeller
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
                  )}
                >
                  {listing.sellerName}
                </span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Once locked, complete bank transfer within 15 minutes. Trade
                auto-cancels on timeout.
              </p>
            </div>

            {/* Commission Notice */}
            <div className="bg-blue-950/30 border border-blue-700/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300">💰 Komisyon (%2)</span>
              </div>
              <span className="text-xs font-bold text-blue-300">
                €{(listing.price * 0.02).toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-blue-400/60 -mt-1 px-1">
              Bu işlem tamamlandığında %2 komisyon kesilir.
            </p>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Coins className="w-3 h-3" />
              This action costs 0.5 AC
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={() => setStep(2)}
              data-ocid="p2p.confirm_button"
            >
              <Lock className="w-4 h-4 mr-2" />
              Confirm &amp; Lock ID
            </Button>
          </div>
        )}

        {/* ── Step 2: Payment Details ───────────────────────────────────── */}
        {step === 2 && listing && (
          <div className="space-y-4">
            {/* Anti-scam warning */}
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300 mb-0.5">
                  ⚠️ Only send money to the payment shown here
                </p>
                <p className="text-[10px] text-amber-200/60">
                  Never use other methods. Scammers may ask for different
                  payment.
                </p>
              </div>
            </div>

            {/* Matched payment method */}
            {(() => {
              const matched = bestPaymentMethod(listing, buyerCountry);
              const meta = matched ? PAYMENT_META[matched] : null;
              return meta ? (
                <div
                  className={cn("rounded-xl p-4 border space-y-3", meta.bgCls)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Send money using selected method
                      </p>
                      <p className={cn("text-base font-bold", meta.colorCls)}>
                        {meta.label}
                      </p>
                    </div>
                  </div>
                  {matched === "iban" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        IBAN
                      </p>
                      <p className="font-mono text-sm font-bold tracking-wider bg-black/30 rounded-lg px-3 py-2">
                        {listing.sellerIban}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account: {listing.sellerName}
                        {listing.sellerType === "admin" && " (Admin)"}
                      </p>
                    </div>
                  )}
                  {(matched === "revolut" ||
                    matched === "wise" ||
                    matched === "zen") && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {matched === "revolut"
                          ? "@username / Phone"
                          : matched === "wise"
                            ? "Email / @Tag"
                            : "@Username"}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-sm font-bold tracking-wider bg-black/30 rounded-lg px-3 py-2",
                          meta.colorCls,
                        )}
                      >
                        @{listing.sellerName.toLowerCase().replace("#", "")}
                      </p>
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            <div className="glass-card rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Para Birimi Seç
                </p>
                <CurrencyChips
                  selected={selectedCurrency}
                  onChange={setSelectedCurrency}
                />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Amount to Send
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  {(() => {
                    const cur = CURRENCIES.find(
                      (c) => c.code === selectedCurrency,
                    )!;
                    const converted = listing.price * cur.rate;
                    const formatted =
                      selectedCurrency === "BTC" || selectedCurrency === "ETH"
                        ? converted.toFixed(6)
                        : converted.toFixed(2);
                    return `${cur.symbol}${formatted} ${selectedCurrency}`;
                  })()}
                </span>
              </div>
              <Separator className="bg-white/5" />
              {/* Payment method badge */}
              <div className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Ödeme Yöntemi
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-foreground">
                  {selectedCurrency === "USDT"
                    ? "💎 USDT (TRC20/ERC20)"
                    : selectedCurrency === "BTC"
                      ? "₿ Bitcoin"
                      : selectedCurrency === "ETH"
                        ? "Ξ Ethereum"
                        : "🏦 Banka Transferi"}
                </span>
              </div>
              <Separator className="bg-white/5" />
              {selectedCurrency === "USDT" ||
              selectedCurrency === "BTC" ||
              selectedCurrency === "ETH" ? (
                <div className="bg-purple-950/30 border border-purple-700/30 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs text-purple-300 font-semibold">
                    {selectedCurrency === "USDT"
                      ? "💎 USDT Cüzdan Adresi"
                      : selectedCurrency === "BTC"
                        ? "₿ Bitcoin Adresi"
                        : "Ξ Ethereum Adresi"}
                  </p>
                  <p className="text-xs text-purple-200/70">
                    Satıcının kripto adresi bilgi bekleniyor
                  </p>
                </div>
              ) : (
                <>
                  <CopyBox
                    value={listing.sellerIban}
                    label="Seller IBAN"
                    adminLabel={
                      isAdminSeller
                        ? "Admin IBAN (Official Channel)"
                        : undefined
                    }
                  />
                </>
              )}
              <CopyBox value={refCode} label="Reference Code" />
            </div>

            <div className="bg-sky-950/30 border border-sky-700/30 rounded-xl p-3.5">
              <p className="text-xs text-sky-300 font-semibold mb-2">
                {selectedCurrency === "USDT" ||
                selectedCurrency === "BTC" ||
                selectedCurrency === "ETH"
                  ? "Kripto Transfer Talimatları"
                  : "Ödeme Talimatları"}
              </p>
              {selectedCurrency === "USDT" ||
              selectedCurrency === "BTC" ||
              selectedCurrency === "ETH" ? (
                <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Kripto cüzdanınızı açın</li>
                  <li>Yukarıdaki adrese tam tutarı gönderin</li>
                  <li>İşlem hash'ini referans olarak kullanın</li>
                  <li>Gönderim ekran görüntüsü alın</li>
                </ol>
              ) : (
                <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Bankacılık uygulamanızı açın</li>
                  <li>
                    Tam olarak{" "}
                    <strong className="text-sky-300">€{listing.price}</strong>{" "}
                    tutarını yukarıdaki IBAN&apos;a gönderin
                  </li>
                  <li>Referans kodunu açıklama alanına yazın</li>
                  <li>Tamamlanan transferin ekran görüntüsünü alın</li>
                </ol>
              )}
            </div>

            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(3)}
              data-ocid="p2p.primary_button"
            >
              <Check className="w-4 h-4 mr-2" />I Sent Payment
            </Button>
          </div>
        )}

        {/* ── Step 3: Payment Confirmation ──────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-300">
                  Your payment is being verified
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seller will confirm once transfer is received
                </p>
              </div>
              <Separator className="bg-white/5" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Your Reference Code
                </p>
                <span className="font-mono text-sm text-primary">
                  {refCode}
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(4)}
              data-ocid="p2p.primary_button"
            >
              Confirm Sent →
            </Button>
          </div>
        )}

        {/* ── Step 4: Upload Proof ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">
                  Upload Payment Screenshot
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional but recommended. Helps resolve disputes faster.
              </p>
              <label className="block cursor-pointer">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                    imagePreview
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/15 hover:border-white/30",
                  )}
                  data-ocid="p2p.dropzone"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Payment proof"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div>
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to select screenshot
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  data-ocid="p2p.upload_button"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/15 hover:bg-white/5"
                onClick={() => setStep(5)}
                data-ocid="p2p.secondary_button"
              >
                Skip
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={() => setStep(5)}
                data-ocid="p2p.submit_button"
              >
                {imagePreview ? "Submit Proof" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Awaiting Confirmation ─────────────────────────────── */}
        {step === 5 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Waiting for seller to confirm
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  You will receive{" "}
                  <span className="font-mono text-primary font-bold">
                    {listing.anonId}
                  </span>{" "}
                  once {isAdminSeller ? "admin" : "seller"} confirms payment.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Protected Trade
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Shield className="w-3 h-3" /> Escrow Secured
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(6)}
              data-ocid="p2p.primary_button"
            >
              Done
            </Button>
          </div>
        )}

        {/* ── Step 6: Transfer Complete ─────────────────────────────────── */}
        {step === 6 && listing && (
          <div
            className="text-center space-y-5 py-6"
            data-ocid="p2p.success_state"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-bold mb-2 text-emerald-300">
                Transfer Complete!
              </h3>
              <p className="font-mono text-xl font-bold text-primary glow-text">
                {listing.anonId}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                is now yours!
              </p>
            </motion.div>
            <Button
              variant="outline"
              className="w-full border-white/15 hover:bg-white/5"
              onClick={onClose}
              data-ocid="p2p.close_button"
            >
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── FakeListingCard ──────────────────────────────────────────────────────────

interface FakeListingCardProps {
  listing: FakeListing;
  index: number;
  onBuyClick: (listing: FakeListing) => void;
}

function FakeListingCard({ listing, index, onBuyClick }: FakeListingCardProps) {
  const [isLocked, setIsLocked] = useState(() =>
    Boolean(listing.nextDropMs && listing.nextDropMs > Date.now()),
  );

  const isUltra = listing.rarity === "ultra";
  const isAdminSeller = listing.sellerType === "admin";
  const hasLockedTag = listing.tags.includes("Locked");
  const showCountdown =
    isUltra && hasLockedTag && isLocked && listing.nextDropMs != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      className={cn(
        "glass-card rounded-xl p-4",
        isAdminSeller && "border-l-[3px] border-l-amber-500/60",
      )}
      style={
        isUltra ? { animation: "ultraGlow 2s ease-in-out infinite" } : undefined
      }
      data-ocid={`p2p.item.${index + 1}`}
    >
      {/* Top row: anonId + rarity badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-mono text-lg font-bold text-primary tracking-wider glow-text leading-none">
          {listing.anonId}
        </span>
        <RarityBadge rarity={listing.rarity} />
      </div>

      {/* Price + seller type */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-emerald-400">
          €{listing.price}
        </span>
        <span
          className={cn(
            "text-xs font-bold px-2.5 py-0.5 rounded-full border",
            isAdminSeller
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
              : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
          )}
        >
          {isAdminSeller ? "👑 Admin" : "👤 User"}
        </span>
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {listing.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                tag === "Official" &&
                  "bg-amber-500/15 text-amber-300 border-amber-500/40",
                tag === "Limited" &&
                  "bg-orange-500/15 text-orange-300 border-orange-500/40",
                tag === "Locked" &&
                  "bg-red-500/15 text-red-300 border-red-500/40",
              )}
            >
              {tag === "Official" && "🔥 "}
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Seller info */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
            isAdminSeller
              ? "bg-amber-500/20 text-amber-300"
              : "bg-primary/15 text-primary",
          )}
        >
          {listing.sellerName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium truncate">
              {listing.sellerName}
            </span>
            <StarRating rating={listing.rating} />
            <KycBadge tradeCount={listing.tradeCount} isAdmin={isAdminSeller} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {listing.tradeCount} trades completed
          </p>
        </div>
      </div>

      {/* Payment methods + countries */}
      <div className="space-y-1.5 mb-3">
        <PaymentMethodBadges methods={listing.paymentMethods} />
        <div className="flex items-center justify-between">
          <CountryChips countries={listing.acceptedCountries} />
          <SellerTrustBadge badge={getTrustBadge(listing, index)} />
        </div>
      </div>

      <TrustBar />
      <Separator className="bg-white/5 my-3" />

      {/* CTA area */}
      {showCountdown ? (
        <div className="space-y-2">
          <UltraDropCountdown
            nextDropMs={listing.nextDropMs!}
            onUnlock={() => setIsLocked(false)}
          />
          <Button
            className="w-full h-10 opacity-50 cursor-not-allowed"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Locked
          </Button>
        </div>
      ) : (
        <Button
          className={cn(
            "w-full h-10 font-bold",
            isUltra
              ? "bg-purple-600 hover:bg-purple-500 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white",
          )}
          onClick={() => onBuyClick(listing)}
          data-ocid="p2p.primary_button"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          BUY NOW
        </Button>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5 flex items-center justify-center gap-1">
        <Coins className="w-2.5 h-2.5" />
        Transfer fee: 0.5 AC
      </p>
    </motion.div>
  );
}

// ─── RealBuyFlowSheet ─────────────────────────────────────────────────────────

interface RealBuyFlowSheetProps {
  open: boolean;
  onClose: () => void;
  listing: P2PListing | null;
  existingTrade: P2PTrade | null;
  onSuccess: () => void;
}

function RealBuyFlowSheet({
  open,
  onClose,
  listing,
  existingTrade,
  onSuccess,
}: RealBuyFlowSheetProps) {
  const { actor } = useActor();
  const [step, setStep] = useState<RealBuyStep>(existingTrade ? 3 : 1);
  const [currentTrade, setCurrentTrade] = useState<P2PTrade | null>(
    existingTrade,
  );
  const [refCode, setRefCode] = useState(
    existingTrade?.referenceNumber ?? genRefCode(),
  );
  const [screenshotHash, setScreenshotHash] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCurrencyReal, setSelectedCurrencyReal] =
    useState<CurrencyCode>("EUR");
  const imagePreviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedCurrencyReal("EUR");
      if (existingTrade) {
        setStep(3);
        setCurrentTrade(existingTrade);
        setRefCode(existingTrade.referenceNumber ?? genRefCode());
      } else {
        setStep(1);
        setCurrentTrade(null);
        setRefCode(genRefCode());
      }
      setScreenshotHash("");
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
      setImagePreview(null);
      imagePreviewRef.current = null;
      setLoading(false);
    }
  }, [open, existingTrade]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const url = URL.createObjectURL(file);
    imagePreviewRef.current = url;
    setImagePreview(url);
    setScreenshotHash(`${file.name}-${file.size}-${Date.now()}`);
  };

  const handleConfirmBuy = async () => {
    if (!actor || !listing) return;
    setLoading(true);
    try {
      const trade = (await (actor as any).buyListing(listing.id)) as P2PTrade;
      setCurrentTrade(trade);
      setStep(2);
    } catch {
      toast.error(
        "Failed to initiate purchase. The listing may no longer be available.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!actor || !currentTrade) return;
    if (!refCode.trim()) {
      toast.error("Reference code is required");
      return;
    }
    setLoading(true);
    try {
      await (actor as any).markPaymentSent(
        currentTrade.id,
        refCode.trim(),
        screenshotHash || "no-screenshot",
      );
      setStep(5);
      onSuccess();
      toast.success("Payment proof submitted!");
    } catch {
      toast.error("Failed to submit proof. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const STEP_TITLES: Record<RealBuyStep, string> = {
    1: "Confirm Purchase",
    2: "Payment Details",
    3: "Confirm Sent",
    4: "Upload Proof",
    5: "Awaiting Seller",
    6: "Submitted",
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && !loading && step < 6 && onClose()}
    >
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[92dvh] overflow-y-auto px-4 pb-10"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            {STEP_TITLES[step]}
          </SheetTitle>
        </SheetHeader>

        {step < 6 && <StepIndicator current={step} total={5} />}

        {/* Step 1: Confirm */}
        {step === 1 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-center pb-1">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Anonymous ID for Sale
                </p>
                <span className="font-mono text-2xl font-bold text-primary tracking-wider glow-text">
                  {listing.listedAnonId}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl font-bold text-emerald-400">
                  €{listing.price}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {listing.sellerAnonId.slice(0, 12)}…
                </span>
              </div>
            </div>
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Once confirmed, complete bank transfer within 15 minutes. Trade
                auto-cancels on timeout.
              </p>
            </div>
            {/* Commission Notice */}
            <div className="bg-blue-950/30 border border-blue-700/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300">💰 Komisyon (%2)</span>
              </div>
              <span className="text-xs font-bold text-blue-300">
                €{(Number(listing.price) * 0.02).toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-blue-400/60 -mt-1 px-1">
              Bu işlem tamamlandığında %2 komisyon kesilir.
            </p>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Coins className="w-3 h-3" />
              Transfer fee: 0.5 AC
            </div>
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={handleConfirmBuy}
              disabled={loading}
              data-ocid="p2p.confirm_button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {loading ? "Processing…" : "Confirm & Lock ID"}
            </Button>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && currentTrade && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Para Birimi Seç
                </p>
                <CurrencyChips
                  selected={selectedCurrencyReal}
                  onChange={setSelectedCurrencyReal}
                />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-xl font-bold text-emerald-400">
                  {(() => {
                    const cur = CURRENCIES.find(
                      (c) => c.code === selectedCurrencyReal,
                    )!;
                    const converted = Number(currentTrade.price) * cur.rate;
                    const formatted =
                      selectedCurrencyReal === "BTC" ||
                      selectedCurrencyReal === "ETH"
                        ? converted.toFixed(6)
                        : converted.toFixed(2);
                    return `${cur.symbol}${formatted} ${selectedCurrencyReal}`;
                  })()}
                </span>
              </div>
              <Separator className="bg-white/5" />
              {/* Payment method badge */}
              <div className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Ödeme Yöntemi
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-foreground">
                  {selectedCurrencyReal === "USDT"
                    ? "💎 USDT (TRC20/ERC20)"
                    : selectedCurrencyReal === "BTC"
                      ? "₿ Bitcoin"
                      : selectedCurrencyReal === "ETH"
                        ? "Ξ Ethereum"
                        : "🏦 Banka Transferi"}
                </span>
              </div>
              <Separator className="bg-white/5" />
              {selectedCurrencyReal === "USDT" ||
              selectedCurrencyReal === "BTC" ||
              selectedCurrencyReal === "ETH" ? (
                <div className="bg-purple-950/30 border border-purple-700/30 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs text-purple-300 font-semibold">
                    {selectedCurrencyReal === "USDT"
                      ? "💎 USDT Cüzdan Adresi"
                      : selectedCurrencyReal === "BTC"
                        ? "₿ Bitcoin Adresi"
                        : "Ξ Ethereum Adresi"}
                  </p>
                  <p className="text-xs text-purple-200/70">
                    Satıcının kripto adresi bilgi bekleniyor
                  </p>
                </div>
              ) : (
                <CopyBox value={currentTrade.iban} label="Seller IBAN" />
              )}
              <CopyBox value={refCode} label="Reference Code" />
            </div>
            <div className="bg-sky-950/30 border border-sky-700/30 rounded-xl p-3.5">
              <p className="text-xs text-sky-300 font-semibold mb-2">
                {selectedCurrencyReal === "USDT" ||
                selectedCurrencyReal === "BTC" ||
                selectedCurrencyReal === "ETH"
                  ? "Kripto Transfer Talimatları"
                  : "Ödeme Talimatları"}
              </p>
              {selectedCurrencyReal === "USDT" ||
              selectedCurrencyReal === "BTC" ||
              selectedCurrencyReal === "ETH" ? (
                <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Kripto cüzdanınızı açın</li>
                  <li>Yukarıdaki adrese tam tutarı gönderin</li>
                  <li>İşlem hash'ini referans olarak kullanın</li>
                  <li>Gönderim ekran görüntüsü alın</li>
                </ol>
              ) : (
                <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Bankacılık uygulamanızı açın</li>
                  <li>
                    Tam olarak{" "}
                    <strong className="text-sky-300">
                      €{currentTrade.price}
                    </strong>{" "}
                    tutarını yukarıdaki IBAN&apos;a gönderin
                  </li>
                  <li>Referans kodunu açıklama olarak kullanın</li>
                  <li>Transfer onayının ekran görüntüsünü alın</li>
                </ol>
              )}
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(3)}
              data-ocid="p2p.primary_button"
            >
              <Check className="w-4 h-4 mr-2" />I Sent Payment
            </Button>
          </div>
        )}

        {/* Step 3: Confirm Sent */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-sky-300">
                Payment is being verified
              </p>
              {refCode && (
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Reference Code
                  </p>
                  <span className="font-mono text-sm text-primary">
                    {refCode}
                  </span>
                </div>
              )}
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(4)}
              data-ocid="p2p.primary_button"
            >
              Confirm Sent →
            </Button>
          </div>
        )}

        {/* Step 4: Upload Proof */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">
                Upload Payment Screenshot (Optional)
              </p>
              <label className="block cursor-pointer">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                    imagePreview
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/15 hover:border-white/30",
                  )}
                  data-ocid="p2p.dropzone"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Payment proof"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div>
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to select screenshot
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  data-ocid="p2p.upload_button"
                />
              </label>
              <Input
                placeholder="Transaction reference number"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-sm"
                data-ocid="p2p.input"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/15 hover:bg-white/5"
                onClick={handleSubmitProof}
                disabled={loading}
                data-ocid="p2p.secondary_button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Skip"
                )}
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={handleSubmitProof}
                disabled={loading}
                data-ocid="p2p.submit_button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                {loading ? "Submitting…" : "Submit Proof"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Awaiting */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-semibold text-amber-300">
                Waiting for seller to confirm
              </p>
              <p className="text-xs text-muted-foreground">
                You will receive the ID once seller confirms payment.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/15 hover:bg-white/5"
              onClick={() => setStep(6)}
              data-ocid="p2p.primary_button"
            >
              Done
            </Button>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div
            className="text-center space-y-5 py-6"
            data-ocid="p2p.success_state"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-emerald-300">
                Proof Submitted!
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Seller will review your payment and confirm transfer shortly.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 w-full"
              onClick={onClose}
              data-ocid="p2p.close_button"
            >
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── DisputeSheet ─────────────────────────────────────────────────────────────

interface DisputeSheetProps {
  open: boolean;
  onClose: () => void;
  tradeId: string;
  onSubmitted: (tradeId: string) => void;
}

function DisputeSheet({
  open,
  onClose,
  tradeId,
  onSubmitted,
}: DisputeSheetProps) {
  const { actor } = useActor();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setEvidence("");
      setSubmitted(false);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Lütfen sorunu açıklayın");
      return;
    }
    setLoading(true);
    try {
      const combinedEvidence = evidence.trim()
        ? `${reason.trim()} | Kanıt: ${evidence.trim()}`
        : reason.trim();
      if (actor) {
        await (actor as any).openDispute(BigInt(tradeId), combinedEvidence);
      }
      onSubmitted(tradeId);
      setSubmitted(true);
      toast.success("Anlaşmazlık açıldı. Admin 24 saat içinde inceleyecek.");
    } catch {
      // Fallback: mark as submitted even if backend call fails (UI-only dispute tracking)
      onSubmitted(tradeId);
      setSubmitted(true);
      toast.success("Anlaşmazlık açıldı. Admin 24 saat içinde inceleyecek.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[80dvh] overflow-y-auto px-4 pb-10"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base text-orange-300">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Anlaşmazlık Bildir
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-300">
                Anlaşmazlık gönderildi
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                ⚠️ İnceleniyor — Admin 24 saat içinde karar verir
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/15 hover:bg-white/5"
              onClick={onClose}
              data-ocid="p2p.close_button"
            >
              Kapat
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-950/30 border border-orange-700/30 rounded-xl p-3.5">
              <p className="text-xs text-orange-200/80 leading-relaxed">
                Trade #{tradeId.slice(0, 8)}… için anlaşmazlık açılacak. Her iki
                taraf kanıt sunabilir. Admin 24 saat içinde inceleyip karar
                verir.
              </p>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                Sorunu Açıklayın *
              </Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Neden anlaşmazlık açıyorsunuz? Detaylı açıklayın..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 text-foreground placeholder:text-muted-foreground resize-none"
                data-ocid="p2p.textarea"
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                Kanıt / Referans No
              </Label>
              <Input
                placeholder="İşlem referans numarası, ekran görüntüsü açıklaması..."
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-orange-500/50 font-mono text-sm"
                data-ocid="p2p.input"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/15 hover:bg-white/5"
                onClick={onClose}
                data-ocid="p2p.cancel_button"
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold"
                onClick={handleSubmit}
                disabled={loading}
                data-ocid="p2p.submit_button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                {loading ? "Gönderiliyor…" : "Anlaşmazlık Gönder"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── AdminDialog ──────────────────────────────────────────────────────────────

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  myAnonId: string;
  onListed: () => void;
}

function AdminDialog({ open, onClose, myAnonId, onListed }: AdminDialogProps) {
  const { actor } = useActor();
  const [price, setPrice] = useState("");
  const [iban, setIban] = useState(ADMIN_IBAN);
  const [rarity, setRarity] = useState<Rarity>("normal");
  const [generatedId, setGeneratedId] = useState(myAnonId);
  const [creating, setCreating] = useState(false);

  const generatePreviewId = () => {
    const p1 = String(Math.floor(Math.random() * 9000) + 1000);
    const p2 = String(Math.floor(Math.random() * 9000) + 1000);
    setGeneratedId(`+777 ${p1} ${p2}`);
  };

  const handleList = async () => {
    if (!actor) return;
    if (!price.trim()) {
      toast.error("Enter a price");
      return;
    }
    if (!iban.trim()) {
      toast.error("Enter IBAN");
      return;
    }
    setCreating(true);
    try {
      await (actor as any).createListing(price.trim(), iban.trim());
      toast.success(`ID listed on market! (${rarity})`);
      onListed();
      onClose();
    } catch {
      toast.error("Failed to list ID");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-[oklch(0.13_0_0)] border border-white/10 text-foreground max-w-sm"
        data-ocid="p2p.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Generated ID */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Preview ID
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                {generatedId}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 hover:bg-white/10 h-9 px-3 text-xs flex-shrink-0"
                onClick={generatePreviewId}
                data-ocid="p2p.secondary_button"
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Rarity */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Rarity
            </Label>
            <Select
              value={rarity}
              onValueChange={(v) => setRarity(v as Rarity)}
            >
              <SelectTrigger
                className="bg-white/5 border-white/10 focus:ring-primary/30 h-9 text-sm"
                data-ocid="p2p.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[oklch(0.16_0_0)] border-white/10">
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="rare">Rare 🔥</SelectItem>
                <SelectItem value="ultra">Ultra 💎</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Price (€)
            </Label>
            <Input
              placeholder="e.g. 50"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50 h-9 text-sm"
              data-ocid="p2p.input"
            />
          </div>

          {/* IBAN */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Admin IBAN
            </Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-xs h-9"
              data-ocid="p2p.input"
            />
          </div>

          <Button
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-10"
            onClick={handleList}
            disabled={creating}
            data-ocid="p2p.submit_button"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {creating ? "Listing…" : "List on Market"}
          </Button>

          <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
            <Coins className="w-3 h-3" />
            Listing fee: 1 AC
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── TradeChatSheet ───────────────────────────────────────────────────────────

interface TradeChatSheetProps {
  open: boolean;
  onClose: () => void;
  tradeId: bigint;
  tradedAnonId: string;
  myAnonId: string;
  isActive: boolean;
}

function TradeChatSheet({
  open,
  onClose,
  tradeId,
  tradedAnonId,
  myAnonId,
  isActive,
}: TradeChatSheetProps) {
  const { actor } = useActor();
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: poll only on open/actor
  useEffect(() => {
    if (!open || !actor) return;
    const poll = async () => {
      if (!actor) return;
      try {
        const data = (await (actor as any).getTradeMessages(
          tradeId,
        )) as TradeMessage[];
        setMessages(data);
      } catch {
        /* silent */
      }
      pollRef.current = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [open, actor]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!actor || !msgText.trim() || !isActive) return;
    setSending(true);
    try {
      const newMsg = (await (actor as any).sendTradeMessage(
        tradeId,
        msgText.trim(),
      )) as TradeMessage;
      setMsgText("");
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      toast.error("Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ns: bigint) => {
    const ms = Number(ns / BigInt(1_000_000));
    return new Date(ms).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col bg-zinc-950 border-white/10 p-0 rounded-t-2xl"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/10 flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-sm font-bold">
            <MessageCircle className="w-4 h-4 text-primary" />
            Trade Chat —{" "}
            <span className="text-primary font-mono">{tradedAnonId}</span>
          </SheetTitle>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground"
            data-ocid="p2p.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        {!isActive && (
          <div className="mx-4 mt-3 px-3 py-2 bg-zinc-800/60 border border-white/10 rounded-lg text-xs text-muted-foreground text-center">
            Bu trade tamamlandı — sohbet salt okunur modda
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              Henüz mesaj yok. İlk mesajı gönder!
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderAnonId === myAnonId;
            return (
              <div
                key={String(msg.id)}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 space-y-0.5",
                    isMine
                      ? "bg-primary/20 border border-primary/30"
                      : "bg-white/8 border border-white/10",
                  )}
                >
                  {!isMine && (
                    <p className="text-[9px] font-mono text-muted-foreground">
                      {msg.senderAnonId}
                    </p>
                  )}
                  <p className="text-sm text-foreground leading-snug">
                    {msg.content}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 text-right">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {isActive && (
          <div className="px-4 pb-4 pt-2 border-t border-white/8 flex gap-2">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Mesajınızı yazın…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
              data-ocid="p2p.input"
            />
            <Button
              size="sm"
              className="h-10 w-10 p-0 bg-primary hover:bg-primary/80 rounded-xl"
              onClick={handleSend}
              disabled={sending || !msgText.trim()}
              data-ocid="p2p.submit_button"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── RateSellerSheet ──────────────────────────────────────────────────────────

interface RateSellerSheetProps {
  open: boolean;
  onClose: () => void;
  trade: P2PTrade | null;
  onRated: (tradeId: bigint) => void;
}

function RateSellerSheet({
  open,
  onClose,
  trade,
  onRated,
}: RateSellerSheetProps) {
  const { actor } = useActor();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!actor || !trade || stars === 0) return;
    setSubmitting(true);
    try {
      (await (actor as any).submitTradeReview(
        trade.id,
        BigInt(stars),
        comment,
      )) as TradeReview;
      toast.success("Değerlendirme gönderildi ✓");
      onRated(trade.id);
      onClose();
    } catch {
      toast.error("Değerlendirme gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-auto bg-zinc-950 border-white/10 p-0 rounded-t-2xl"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2 text-sm font-bold">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Satıcıyı Değerlendir
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 py-5 space-y-5">
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Kaç yıldız verirsiniz?
            </p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className="focus:outline-none transition-transform active:scale-90"
                  data-ocid="p2p.toggle"
                >
                  <Star
                    className={cn(
                      "w-9 h-9 transition-colors",
                      n <= stars
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-600",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nasıl bir deneyimdi?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
              data-ocid="p2p.textarea"
            />
          </div>
          <div className="flex gap-3 pb-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10"
              onClick={onClose}
              data-ocid="p2p.cancel_button"
            >
              İptal
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold"
              onClick={handleSubmit}
              disabled={submitting || stars === 0}
              data-ocid="p2p.submit_button"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-2 fill-current" />
              )}
              Gönder
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── P2PMarket (main export) ──────────────────────────────────────────────────

export function P2PMarket({ myAnonId }: { myAnonId: string }) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<P2PTab>("market");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [buyerCountry, setBuyerCountry] = useState<string>(
    () => localStorage.getItem("anon_buyer_country") ?? "",
  );
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sameCountryOnly, setSameCountryOnly] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Market
  const [listings, setListings] = useState<P2PListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<P2PListing | null>(
    null,
  );
  const [realBuyOpen, setRealBuyOpen] = useState(false);

  // Fake buy flow
  const [fakeBuyListing, setFakeBuyListing] = useState<FakeListing | null>(
    null,
  );
  const [fakeBuyOpen, setFakeBuyOpen] = useState(false);

  // My Listings
  const [myListings, setMyListings] = useState<P2PListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newIban, setNewIban] = useState("");
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState<
    string | null
  >(null);
  const [creating, setCreating] = useState(false);

  // My Trades
  const [trades, setTrades] = useState<P2PTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [proofTrade, setProofTrade] = useState<P2PTrade | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  // Admin
  const [adminOpen, setAdminOpen] = useState(false);

  // Trade Chat
  const [chatTrade, setChatTrade] = useState<P2PTrade | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Rate Seller
  const [rateTrade, setRateTrade] = useState<P2PTrade | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [ratedTradeIds, setRatedTradeIds] = useState<Set<string>>(new Set());
  const [disputedTrades, setDisputedTrades] = useState<Set<string>>(new Set());
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeTradeId, setDisputeTradeId] = useState<string>("");

  // ── Check admin role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actor) return;
    (actor as any)
      .isCallerAdmin()
      .then((res: boolean) => setIsAdmin(res))
      .catch(() => {});
  }, [actor]);

  // ── Fetchers ─────────────────────────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getActiveListings()) as P2PListing[];
      setListings(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  const fetchMyListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getMyListings()) as P2PListing[];
      setMyListings(data);
    } catch {
      // silent - background poll
    }
  }, [actor]);

  const fetchTrades = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getMyTrades()) as P2PTrade[];
      setTrades(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  // ── Initial loads ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!actor) return;
    setListingsLoading(true);
    fetchListings().finally(() => setListingsLoading(false));
  }, [actor, fetchListings]);

  useEffect(() => {
    if (!actor) return;
    setMyListingsLoading(true);
    fetchMyListings().finally(() => setMyListingsLoading(false));
  }, [actor, fetchMyListings]);

  useEffect(() => {
    if (!actor) return;
    setTradesLoading(true);
    fetchTrades().finally(() => setTradesLoading(false));
  }, [actor, fetchTrades]);

  // ── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!actor) return;
    const id = setInterval(fetchListings, 10_000);
    return () => clearInterval(id);
  }, [actor, fetchListings]);

  useEffect(() => {
    if (!actor) return;
    const id = setInterval(fetchTrades, 5_000);
    return () => clearInterval(id);
  }, [actor, fetchTrades]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCancelListing = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).cancelListing(id);
      toast.success("Listing cancelled");
      fetchMyListings();
    } catch {
      toast.error("Failed to cancel listing");
    }
  };

  const handleCreateListing = async () => {
    if (!actor) {
      toast.error("Bağlantı bekleniyor, lütfen bekleyin");
      return;
    }
    if (!myAnonId) {
      toast.error("Önce ID oluşturmanız gerekiyor");
      return;
    }
    if (!newPrice.trim()) {
      toast.error("Fiyat girin");
      return;
    }
    if (!newIban.trim()) {
      toast.error("IBAN / adres girin");
      return;
    }
    setCreating(true);
    try {
      await (actor as any).createListing(newPrice.trim(), newIban.trim());
      toast.success("İlan oluşturuldu!");
      setNewPrice("");
      setNewIban("");
      fetchMyListings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already have an active")) {
        toast.error("Zaten aktif bir ilanınız var. Önce iptal edin.");
      } else if (msg.includes("register")) {
        toast.error("Önce ID oluşturmanız gerekiyor");
      } else {
        toast.error(`İlan oluşturulamadı: ${msg.slice(0, 80)}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).confirmTrade(id);
      toast.success("Trade confirmed! ID transfer initiated.");
      fetchTrades();
    } catch {
      toast.error("Failed to confirm trade");
    }
  };

  const handleRejectTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).rejectTrade(id);
      toast.success("Trade rejected.");
      fetchTrades();
    } catch {
      toast.error("Failed to reject trade");
    }
  };

  const handleCancelTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).cancelTrade(id);
      toast.success("Trade cancelled.");
      fetchTrades();
    } catch {
      toast.error("Failed to cancel trade");
    }
  };

  const handleTradeExpired = useCallback(async () => {
    if (!actor) return;
    try {
      await (actor as any).cancelExpiredTrades();
      fetchTrades();
    } catch {
      // silent
    }
  }, [actor, fetchTrades]);

  const onBuySuccess = useCallback(() => {
    fetchListings();
    fetchTrades();
    fetchMyListings();
  }, [fetchListings, fetchTrades, fetchMyListings]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const realListings = listings.filter((l) => l.sellerAnonId !== myAnonId);

  const filteredFakeListings = FAKE_LISTINGS.filter((l) => {
    if (rarityFilter !== "all" && l.rarity !== rarityFilter) return false;
    return matchesFilters(l, buyerCountry, paymentFilter, sameCountryOnly);
  });

  const filteredRealListings = realListings.filter((_l) => {
    if (rarityFilter === "all" || rarityFilter === "normal") return true;
    return false; // real listings have no rarity metadata, only show in "all" / "normal"
  });

  const hasActiveListing = myListings.some(
    (l) => vk(l.status) === "Active" || vk(l.status) === "Locked",
  );

  // Sort fake listings: admin first, then ultra→rare→normal, then price asc
  const RARITY_ORDER: Record<Rarity, number> = { ultra: 0, rare: 1, normal: 2 };
  const sortedFakeListings = [...filteredFakeListings].sort((a, b) => {
    if (a.sellerType === "admin" && b.sellerType !== "admin") return -1;
    if (b.sellerType === "admin" && a.sellerType !== "admin") return 1;
    const rd = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    if (rd !== 0) return rd;
    return a.price - b.price;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Inject ultraGlow keyframe */}
      <style>{`
        @keyframes ultraGlow {
          0%, 100% { box-shadow: 0 0 8px oklch(0.627 0.265 303.9 / 0.7), 0 0 16px oklch(0.627 0.265 303.9 / 0.4), 0 0 0 1px oklch(0.627 0.265 303.9 / 0.2); }
          50%       { box-shadow: 0 0 24px oklch(0.627 0.265 303.9 / 1), 0 0 48px oklch(0.5 0.25 280 / 0.6), 0 0 0 1px oklch(0.627 0.265 303.9 / 0.4); }
        }
      `}</style>

      <div className="pb-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight leading-none">
                  P2P ID Market
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Trade anonymous IDs via bank transfer
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-8 px-3 text-xs gap-1.5"
                onClick={() => setAdminOpen(true)}
                data-ocid="p2p.secondary_button"
              >
                <Settings className="w-3.5 h-3.5" />
                Admin
              </Button>
            )}
          </div>
        </div>

        {/* ── Trade Stats Panel ─────────────────────────────────────────── */}
        <div className="px-4">
          <TradeStatsPanel />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as P2PTab)}
          className="px-4"
        >
          {/* Sticky tab bar */}
          <div className="sticky top-0 z-10 bg-background -mx-4 px-4 pb-2 pt-1">
            <TabsList className="w-full bg-white/5 border border-white/10 h-9 p-0.5">
              <TabsTrigger
                value="market"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                Market
              </TabsTrigger>
              <TabsTrigger
                value="listings"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                My Listings
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                My Trades
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Market Tab ───────────────────────────────────────────────── */}
          <TabsContent value="market" className="mt-3 space-y-3">
            {/* Activity Feed */}
            <ActivityFeed />

            {/* Country + Payment filter bar */}
            <div className="space-y-2">
              {/* Row 1: country + payment */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {/* Buyer country */}
                <div className="flex-shrink-0">
                  <select
                    value={buyerCountry}
                    onChange={(e) => {
                      setBuyerCountry(e.target.value);
                      localStorage.setItem(
                        "anon_buyer_country",
                        e.target.value,
                      );
                    }}
                    className="h-8 px-2 text-[11px] bg-white/5 border border-white/10 rounded-full text-foreground cursor-pointer"
                    data-ocid="p2p.select"
                  >
                    <option value="">🌍 Your Country</option>
                    {BUYER_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Payment method */}
                <div className="flex-shrink-0">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="h-8 px-2 text-[11px] bg-white/5 border border-white/10 rounded-full text-foreground cursor-pointer"
                    data-ocid="p2p.select"
                  >
                    <option value="all">💳 Payment: Any</option>
                    <option value="iban">🏦 IBAN</option>
                    <option value="revolut">🔵 Revolut</option>
                    <option value="wise">💚 Wise</option>
                    <option value="zen">⚡ Zen</option>
                  </select>
                </div>
              </div>
              {/* Row 2: toggles */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSameCountryOnly((v) => !v)}
                  className={cn(
                    "flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                    sameCountryOnly
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10",
                  )}
                  data-ocid="p2p.toggle"
                >
                  🌍 Same country
                </button>
                {(buyerCountry ||
                  paymentFilter !== "all" ||
                  sameCountryOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerCountry("");
                      setPaymentFilter("all");
                      setSameCountryOnly(false);
                      localStorage.removeItem("anon_buyer_country");
                    }}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-red-500/30 bg-red-500/10 text-red-400 transition-all"
                    data-ocid="p2p.button"
                  >
                    ✕ Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(["all", "normal", "rare", "ultra"] as RarityFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRarityFilter(f)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      rarityFilter === f
                        ? f === "ultra"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : f === "rare"
                            ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                            : "bg-primary/20 text-primary border-primary/40"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10",
                    )}
                    data-ocid="p2p.toggle"
                  >
                    {f === "all"
                      ? "All"
                      : f === "normal"
                        ? "Normal"
                        : f === "rare"
                          ? "Rare 🔥"
                          : "Ultra 💎"}
                  </button>
                ),
              )}
            </div>

            {/* Real listings (from backend) */}
            {listingsLoading ? (
              <div
                className="flex justify-center py-6"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              filteredRealListings.map((listing, i) => (
                <motion.div
                  key={String(listing.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl p-4"
                  data-ocid={`p2p.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Anonymous ID
                      </p>
                      <span className="font-mono text-xl font-bold text-primary tracking-wider glow-text">
                        {listing.listedAnonId}
                      </span>
                    </div>
                    <ListingStatusBadge
                      kind={vk(listing.status) as ListingStatusKind}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-emerald-400">
                      €{listing.price}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {listing.sellerAnonId.slice(0, 12)}…
                    </span>
                  </div>
                  <TrustBar />
                  <Separator className="bg-white/5 my-3" />
                  <Button
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={() => {
                      const existingPending = trades.find(
                        (t) =>
                          t.listingId === listing.id &&
                          (vk(t.status) === "Pending" ||
                            vk(t.status) === "PaymentSent"),
                      );
                      if (existingPending) {
                        setProofTrade(existingPending);
                        setProofOpen(true);
                      } else {
                        setSelectedListing(listing);
                        setRealBuyOpen(true);
                      }
                    }}
                    disabled={vk(listing.status) === "Locked"}
                    data-ocid="p2p.primary_button"
                  >
                    {vk(listing.status) === "Locked" ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Trade in Progress
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        BUY NOW
                      </>
                    )}
                  </Button>
                </motion.div>
              ))
            )}

            {/* Fake listings (always shown) */}
            {sortedFakeListings.map((listing, i) => (
              <FakeListingCard
                key={listing.id}
                listing={listing}
                index={filteredRealListings.length + i}
                onBuyClick={(l) => {
                  setFakeBuyListing(l);
                  setFakeBuyOpen(true);
                }}
              />
            ))}

            {/* Empty state only if both lists are empty */}
            {!listingsLoading &&
              filteredRealListings.length === 0 &&
              sortedFakeListings.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center space-y-3"
                  data-ocid="p2p.empty_state"
                >
                  <div className="text-3xl">🌍</div>
                  <p className="text-sm font-semibold text-foreground/70">
                    No compatible payment method for your region
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-[220px]">
                    Try clearing your filters or selecting a different country.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerCountry("");
                      setPaymentFilter("all");
                      setSameCountryOnly(false);
                      localStorage.removeItem("anon_buyer_country");
                      setRarityFilter("all");
                    }}
                    className="text-xs text-primary border border-primary/30 bg-primary/10 px-3 py-1.5 rounded-full"
                    data-ocid="p2p.button"
                  >
                    Clear all filters
                  </button>
                  <Tag className="w-8 h-8 text-muted-foreground/30 mb-3 hidden" />
                  <p className="text-sm text-muted-foreground">
                    No listings match this filter.
                  </p>
                </div>
              )}
          </TabsContent>

          {/* ── My Listings Tab ──────────────────────────────────────────── */}
          <TabsContent value="listings" className="mt-3 space-y-3">
            {myListingsLoading ? (
              <div
                className="flex justify-center py-12"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Existing listings */}
                {myListings.length === 0 && (
                  <div className="text-center py-6" data-ocid="p2p.empty_state">
                    <Tag className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      You have no listings yet.
                    </p>
                  </div>
                )}

                {myListings.map((listing, i) => (
                  <div
                    key={String(listing.id)}
                    className="glass-card rounded-xl p-4"
                    data-ocid={`p2p.item.${i + 1}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Listed ID
                        </p>
                        <span className="font-mono text-base font-bold text-primary tracking-wider">
                          {listing.listedAnonId}
                        </span>
                      </div>
                      <ListingStatusBadge
                        kind={vk(listing.status) as ListingStatusKind}
                      />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-400">
                        €{listing.price}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {listing.iban.slice(0, 8)}…{listing.iban.slice(-4)}
                      </span>
                    </div>
                    {vk(listing.status) === "Active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-8 text-xs w-full"
                        onClick={() => handleCancelListing(listing.id)}
                        data-ocid="p2p.delete_button"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" />
                        Cancel Listing
                      </Button>
                    )}
                  </div>
                ))}

                <Separator className="bg-white/5 my-2" />

                {/* Create form or warning */}
                {hasActiveListing ? (
                  <div
                    className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4 text-center"
                    data-ocid="p2p.panel"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-amber-300 font-medium">
                      Active listing exists
                    </p>
                    <p className="text-xs text-amber-200/60 mt-1">
                      Cancel your existing listing to create a new one.
                    </p>
                  </div>
                ) : (
                  <div
                    className="glass-card rounded-xl p-4 space-y-4"
                    data-ocid="p2p.card"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold">Create New Listing</h3>
                    </div>

                    <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your current ID{" "}
                        <span className="text-primary font-mono font-bold">
                          {myAnonId}
                        </span>{" "}
                        will be listed for sale. When sold, you&apos;ll receive
                        a new random ID.
                      </p>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Asking Price (€) *
                      </Label>
                      <Input
                        placeholder="e.g. 50"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-primary/50"
                        data-ocid="p2p.input"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Ödeme Yöntemi Seç
                      </Label>
                      {/* Category tabs */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {BANK_GROUPS.map((g) => (
                          <button
                            key={g.label}
                            type="button"
                            onClick={() =>
                              setSelectedPaymentGroup(
                                selectedPaymentGroup === g.label
                                  ? null
                                  : g.label,
                              )
                            }
                            className={`text-[9px] font-semibold px-2 py-1 rounded-full border transition-all ${selectedPaymentGroup === g.label ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-white/15 text-zinc-400 hover:bg-white/10"}`}
                          >
                            {g.label.split(" ")[0]}{" "}
                            {g.label.split(" ").slice(1).join(" ")}
                          </button>
                        ))}
                      </div>
                      {/* Bank chips in selected group */}
                      {selectedPaymentGroup &&
                        (() => {
                          const grp = BANK_GROUPS.find(
                            (g) => g.label === selectedPaymentGroup,
                          );
                          if (!grp) return null;
                          const visibleBanks = showAllBanks
                            ? grp.banks
                            : grp.banks.slice(0, 8);
                          return (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {visibleBanks.map((bank) => (
                                <button
                                  key={bank.id}
                                  type="button"
                                  onClick={() => setNewIban(bank.placeholder)}
                                  className="text-[9px] font-semibold px-2 py-1 rounded-full border bg-white/5 border-white/15 text-zinc-300 hover:bg-primary/20 hover:border-primary/40 hover:text-primary transition-all"
                                >
                                  {bank.name}
                                </button>
                              ))}
                              {!showAllBanks && grp.banks.length > 8 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllBanks(true)}
                                  className="text-[9px] font-semibold px-2 py-1 rounded-full border bg-white/5 border-white/15 text-zinc-400 hover:bg-white/10 transition-all"
                                >
                                  +{grp.banks.length - 8} daha
                                </button>
                              )}
                            </div>
                          );
                        })()}
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                        IBAN / Adres / Kullanıcı adı *
                      </Label>
                      <Input
                        placeholder="IBAN, cüzdan adresi veya @kullanıcı"
                        value={newIban}
                        onChange={(e) => setNewIban(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-sm"
                        data-ocid="p2p.input"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Alıcılar ödemeyi bu hesaba gönderecek.
                      </p>
                    </div>

                    <Button
                      className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={handleCreateListing}
                      disabled={
                        creating ||
                        !newPrice.trim() ||
                        !newIban.trim() ||
                        !myAnonId
                      }
                      data-ocid="p2p.submit_button"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {creating ? "Creating…" : "List My ID for Sale"}
                    </Button>

                    <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
                      <Coins className="w-3 h-3" />
                      This action costs 1 AC
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── My Trades Tab ────────────────────────────────────────────── */}
          <TabsContent value="trades" className="mt-3 space-y-3">
            {tradesLoading ? (
              <div
                className="flex justify-center py-12"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : trades.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="p2p.empty_state"
              >
                <Wallet className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  No trades yet.
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Buy or sell an ID to start trading.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {trades.map((trade, i) => {
                  const isBuyer = trade.buyerAnonId === myAnonId;
                  const isSeller = trade.sellerAnonId === myAnonId;
                  const statusKind = vk(trade.status) as TradeStatusKind;

                  return (
                    <motion.div
                      key={String(trade.id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card rounded-xl p-4"
                      data-ocid={`p2p.item.${i + 1}`}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            {isBuyer ? "Buying" : "Selling"}
                          </p>
                          <span className="font-mono text-base font-bold text-primary tracking-wider">
                            {trade.listedAnonId}
                          </span>
                        </div>
                        <TradeStatusBadge kind={statusKind} />
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">
                            Price
                          </span>
                          <span className="font-bold text-emerald-400">
                            €{trade.price}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">
                            {isBuyer ? "Seller" : "Buyer"}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {(isBuyer
                              ? trade.sellerAnonId
                              : trade.buyerAnonId
                            ).slice(0, 12)}
                            …
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground mb-3">
                        Trade #{Number(trade.id)}
                      </p>

                      {/* Trade Status Timeline */}
                      <div className="mb-3">
                        {(() => {
                          const steps = [
                            { key: "Pending", label: "Bekliyor" },
                            { key: "PaymentSent", label: "Ödeme Gönderildi" },
                            { key: "Confirmed", label: "Onaylandı" },
                            { key: "Confirmed", label: "Tamamlandı" },
                          ];
                          const cancelledOrDisputed =
                            statusKind === "Cancelled" ||
                            statusKind === "Disputed";
                          const activeIdx = steps.findIndex(
                            (s) => s.key === statusKind,
                          );
                          return (
                            <div className="flex items-center gap-0 overflow-x-auto pb-1">
                              {steps.map((s, idx) => {
                                const isPast = activeIdx > idx;
                                const isCurrent = activeIdx === idx;
                                const _isCancel =
                                  cancelledOrDisputed && idx === activeIdx;
                                return (
                                  <div
                                    key={s.key}
                                    className="flex items-center"
                                  >
                                    <div className="flex flex-col items-center min-w-[52px]">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          cancelledOrDisputed && isCurrent
                                            ? "bg-red-500"
                                            : isCurrent
                                              ? "bg-emerald-400 ring-2 ring-emerald-400/30"
                                              : isPast
                                                ? "bg-emerald-500"
                                                : "bg-white/15"
                                        }`}
                                      />
                                      <span
                                        className={`text-[9px] mt-0.5 text-center leading-tight ${
                                          cancelledOrDisputed && isCurrent
                                            ? "text-red-400"
                                            : isCurrent
                                              ? "text-emerald-400 font-semibold"
                                              : isPast
                                                ? "text-emerald-500/70"
                                                : "text-muted-foreground/40"
                                        }`}
                                      >
                                        {s.label}
                                      </span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                      <div
                                        className={`h-px w-3 mx-0.5 flex-shrink-0 ${isPast ? "bg-emerald-500/50" : "bg-white/10"}`}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                              {cancelledOrDisputed && (
                                <div className="flex items-center ml-1">
                                  <div className="h-px w-3 bg-white/10 flex-shrink-0" />
                                  <div className="flex flex-col items-center min-w-[52px]">
                                    <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                                    <span className="text-[9px] mt-0.5 text-center leading-tight text-red-400 font-semibold">
                                      {statusKind === "Disputed"
                                        ? "Anlaşmazlık"
                                        : "İptal"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Escrow badge for active trades */}
                      {(statusKind === "Pending" ||
                        statusKind === "PaymentSent") && (
                        <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-700/30 rounded-lg px-3 py-2.5 mb-3">
                          <span className="text-base leading-none mt-0.5">
                            🔒
                          </span>
                          <div>
                            <p className="text-xs font-bold text-emerald-400">
                              ID Escrow&apos;da
                            </p>
                            <p className="text-[10px] text-emerald-300/70 leading-tight mt-0.5">
                              ID sistem güvencesinde • Transfer sadece onayda
                              gerçekleşir
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Countdown for buyer + Pending */}
                      {isBuyer && statusKind === "Pending" && (
                        <div className="flex items-center justify-between mb-3 bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-700/20">
                          <span className="text-xs text-amber-300">
                            Time remaining:
                          </span>
                          <TradeCountdownTimer
                            createdAtNs={trade.createdAt}
                            onExpired={handleTradeExpired}
                          />
                        </div>
                      )}

                      {/* Buyer actions — Pending */}
                      {isBuyer && statusKind === "Pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-9 text-xs"
                            onClick={() => {
                              setProofTrade(trade);
                              setProofOpen(true);
                            }}
                            data-ocid="p2p.primary_button"
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Mark Payment Sent
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-3"
                            onClick={() => handleCancelTrade(trade.id)}
                            data-ocid="p2p.delete_button"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Seller actions — PaymentSent */}
                      {isSeller && statusKind === "PaymentSent" && (
                        <div className="space-y-3">
                          <div className="bg-sky-950/20 border border-sky-700/20 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-sky-300 font-semibold mb-1.5">
                              Buyer&apos;s Payment Proof
                            </p>
                            {trade.referenceNumber && (
                              <p className="text-xs text-muted-foreground">
                                Ref:{" "}
                                <span className="text-foreground font-mono">
                                  {trade.referenceNumber}
                                </span>
                              </p>
                            )}
                            {trade.proofScreenshotHash && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Hash:{" "}
                                <span className="text-foreground font-mono text-[10px]">
                                  {trade.proofScreenshotHash.slice(0, 24)}…
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-9 text-xs"
                              onClick={() => handleConfirmTrade(trade.id)}
                              data-ocid="p2p.confirm_button"
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 text-xs"
                              onClick={() => handleRejectTrade(trade.id)}
                              data-ocid="p2p.delete_button"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Dispute button for PaymentSent or Confirmed */}
                      {(statusKind === "PaymentSent" ||
                        statusKind === "Confirmed") && (
                        <div className="mt-2">
                          {disputedTrades.has(String(trade.id)) ? (
                            <div className="flex items-center gap-2 bg-orange-950/20 border border-orange-700/30 rounded-lg px-3 py-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                              <p className="text-xs text-orange-300 font-medium">
                                ⚠️ İnceleniyor — Admin 24 saat içinde karar verir
                              </p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-9 text-xs"
                              onClick={() => {
                                setDisputeTradeId(String(trade.id));
                                setDisputeOpen(true);
                              }}
                              data-ocid="p2p.open_modal_button"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                              ⚠️ Anlaşmazlık Aç
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Trade Chat button for active trades */}
                      {(statusKind === "Pending" ||
                        statusKind === "PaymentSent") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-primary/30 text-primary hover:bg-primary/10 h-9 text-xs mt-2"
                          onClick={() => {
                            setChatTrade(trade);
                            setChatOpen(true);
                          }}
                          data-ocid="p2p.secondary_button"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                          {isBuyer ? "💬 Satıcıyla Yaz" : "💬 Alıcıyla Yaz"}
                        </Button>
                      )}

                      {/* Rate seller button after confirmed trade (buyer only) */}
                      {isBuyer &&
                        statusKind === "Confirmed" &&
                        !ratedTradeIds.has(String(trade.id)) && (
                          <Button
                            size="sm"
                            className="w-full bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 h-9 text-xs mt-2"
                            onClick={() => {
                              setRateTrade(trade);
                              setRateOpen(true);
                            }}
                            data-ocid="p2p.secondary_button"
                          >
                            <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                            ⭐ Satıcıyı Değerlendir
                          </Button>
                        )}
                      {isBuyer &&
                        statusKind === "Confirmed" &&
                        ratedTradeIds.has(String(trade.id)) && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-400/70">
                            <Star className="w-3 h-3 fill-current" />
                            Değerlendirme gönderildi ✓
                          </div>
                        )}

                      {/* Confirmed state */}
                      {statusKind === "Confirmed" && (
                        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-700/20 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <p className="text-xs text-emerald-300 font-medium">
                            Trade complete!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Fake buy flow sheet ───────────────────────────────────────────── */}
      <FakeBuyFlowSheet
        open={fakeBuyOpen}
        onClose={() => {
          setFakeBuyOpen(false);
          setFakeBuyListing(null);
        }}
        listing={fakeBuyListing}
        buyerCountry={buyerCountry}
      />

      {/* ── Real buy flow sheet ───────────────────────────────────────────── */}
      <RealBuyFlowSheet
        open={realBuyOpen}
        onClose={() => {
          setRealBuyOpen(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        existingTrade={
          selectedListing
            ? (trades.find(
                (t) =>
                  t.listingId === selectedListing.id &&
                  (vk(t.status) === "Pending" ||
                    vk(t.status) === "PaymentSent"),
              ) ?? null)
            : null
        }
        onSuccess={onBuySuccess}
      />

      {/* ── Proof sheet for existing pending trade ─────────────────────────── */}
      <RealBuyFlowSheet
        open={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofTrade(null);
        }}
        listing={null}
        existingTrade={proofTrade}
        onSuccess={onBuySuccess}
      />

      {/* ── Trade Chat Sheet ──────────────────────────────────────────────────── */}
      <TradeChatSheet
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatTrade(null);
        }}
        tradeId={chatTrade?.id ?? BigInt(0)}
        tradedAnonId={chatTrade?.listedAnonId ?? ""}
        myAnonId={myAnonId}
        isActive={
          chatTrade
            ? chatTrade.status.__kind__ === "Pending" ||
              chatTrade.status.__kind__ === "PaymentSent"
            : false
        }
      />

      {/* ── Rate Seller Sheet ──────────────────────────────────────────────────── */}
      <RateSellerSheet
        open={rateOpen}
        onClose={() => {
          setRateOpen(false);
          setRateTrade(null);
        }}
        trade={rateTrade}
        onRated={(id) =>
          setRatedTradeIds((prev) => new Set([...prev, String(id)]))
        }
      />

      {/* ── Dispute Sheet ──────────────────────────────────────────────────────── */}
      <DisputeSheet
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        tradeId={disputeTradeId}
        onSubmitted={(id) => {
          setDisputedTrades((prev) => new Set([...prev, id]));
          setDisputeOpen(false);
        }}
      />

      {/* ── Admin dialog ─────────────────────────────────────────────────────── */}
      <AdminDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        myAnonId={myAnonId}
        onListed={fetchListings}
      />
    </>
  );
}
