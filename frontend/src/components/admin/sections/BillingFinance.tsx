"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Search, Filter,
  Plus, Copy, Send, Edit, PauseCircle, Download, FileText,
  Building2, ArrowUpDown, ChevronRight, X, Check
} from "lucide-react";
import { toast } from "sonner";

interface InvoiceItem {
  description: string;
  shipmentType: string;
  price: number;
  qty: number;
  amount: number;
}

interface Invoice {
  id: string;
  company: string;
  companyLogo?: string;
  shippingId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Pending" | "Overdue";
  billFrom: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  billTo: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  items: InvoiceItem[];
  subTotal: number;
  tax: number;
  fee: number;
  total: number;
  note?: string;
}

const INITIAL_INVOICES: Invoice[] = [
  {
    id: "INV-1001",
    company: "TechGear Inc.",
    shippingId: "#SH9283746",
    issueDate: "Mar 15, 2035",
    dueDate: "Mar 22, 2035",
    amount: 1250.0,
    status: "Paid",
    billFrom: {
      name: "TechGear Inc.",
      email: "billing@techgear.io",
      address: "100 Silicon Valley Blvd, CA 94025, USA",
      phone: "+1 415-555-0199",
    },
    billTo: {
      name: "ShipNow Logistics",
      email: "accounts@shipnow.com",
      address: "901 Distribution Ave, Charlotte, NC 28217, USA",
      phone: "+1 704-555-9911",
    },
    items: [
      { description: "Enterprise Hardware Hub", shipmentType: "Air Freight Express", price: 650.0, qty: 1, amount: 650.0 },
      { description: "Pro Router Modules", shipmentType: "Road Freight Standard", price: 300.0, qty: 2, amount: 600.0 },
    ],
    subTotal: 1250.0,
    tax: 100.0,
    fee: 15.0,
    total: 1365.0,
    note: "Payment received via Wire Transfer. Thank you for your business!",
  },
  {
    id: "INV-1002",
    company: "StyleHub Co.",
    shippingId: "#SH9182635",
    issueDate: "Mar 16, 2035",
    dueDate: "Mar 23, 2035",
    amount: 980.0,
    status: "Unpaid",
    billFrom: {
      name: "StyleHub Co.",
      email: "finance@stylehub.com",
      address: "45 Fashion Way, New York, NY 10001, USA",
      phone: "+1 212-555-3421",
    },
    billTo: {
      name: "Global Retailers",
      email: "pay@globalretail.com",
      address: "777 Commerce St, Chicago, IL 60601, USA",
      phone: "+1 312-555-8833",
    },
    items: [
      { description: "Summer Apparel Pack", shipmentType: "Road Freight Express", price: 245.0, qty: 4, amount: 980.0 },
    ],
    subTotal: 980.0,
    tax: 78.4,
    fee: 10.0,
    total: 1068.4,
    note: "Please process payment by the due date to avoid delivery disruption.",
  },
  {
    id: "INV-1003",
    company: "FreshNest",
    shippingId: "#SH9037821",
    issueDate: "Mar 14, 2035",
    dueDate: "Mar 21, 2035",
    amount: 1320.0,
    status: "Paid",
    billFrom: {
      name: "FreshNest",
      email: "orders@freshnest.org",
      address: "12 Green Farm Rd, Austin, TX 78701, USA",
      phone: "+1 512-555-9012",
    },
    billTo: {
      name: "ShipNow Logistics",
      email: "accounts@shipnow.com",
      address: "901 Distribution Ave, Charlotte, NC 28217, USA",
      phone: "+1 704-555-9911",
    },
    items: [
      { description: "Organic Produce Crate", shipmentType: "Cold Chain Transport", price: 330.0, qty: 4, amount: 1320.0 },
    ],
    subTotal: 1320.0,
    tax: 105.6,
    fee: 20.0,
    total: 1445.6,
    note: "Paid in full.",
  },
  {
    id: "INV-1004",
    company: "FitPlus Gear",
    shippingId: "#SH9374652",
    issueDate: "Mar 17, 2035",
    dueDate: "Mar 24, 2035",
    amount: 1150.0,
    status: "Unpaid",
    billFrom: {
      name: "FitPlus Gear",
      email: "sales@fitplus.com",
      address: "88 Athletic Blvd, Denver, CO 80202, USA",
      phone: "+1 303-555-4123",
    },
    billTo: {
      name: "Metro Fitness Chains",
      email: "billing@metrofit.com",
      address: "500 Sport Ave, Miami, FL 33101, USA",
      phone: "+1 305-555-7766",
    },
    items: [
      { description: "Smart Treadmill Sensors", shipmentType: "Road Freight Standard", price: 575.0, qty: 2, amount: 1150.0 },
    ],
    subTotal: 1150.0,
    tax: 92.0,
    fee: 10.0,
    total: 1252.0,
    note: "Net 30 terms apply.",
  },
  {
    id: "INV-1005",
    company: "AutoParts Pro",
    shippingId: "#SH9457830",
    issueDate: "Mar 15, 2035",
    dueDate: "Mar 22, 2035",
    amount: 1480.0,
    status: "Overdue",
    billFrom: {
      name: "AutoParts Pro",
      email: "accounts@autoparts.com",
      address: "300 Industrial Pkwy, Detroit, MI 48201, USA",
      phone: "+1 313-555-9800",
    },
    billTo: {
      name: "LogiTrans Depot",
      email: "invoices@logitrans.com",
      address: "1200 Transport Way, Seattle, WA 98101, USA",
      phone: "+1 206-555-3344",
    },
    items: [
      { description: "Brake Rotor Assembly", shipmentType: "Heavy Freight", price: 370.0, qty: 4, amount: 1480.0 },
    ],
    subTotal: 1480.0,
    tax: 118.4,
    fee: 25.0,
    total: 1623.4,
    note: "OVERDUE NOTICE: Late fees of 5% applied after 3 business days.",
  },
  {
    id: "INV-1006",
    company: "EcoLights",
    shippingId: "#SH8821349",
    issueDate: "Mar 13, 2035",
    dueDate: "Mar 20, 2035",
    amount: 790.0,
    status: "Paid",
    billFrom: {
      name: "EcoLights",
      email: "support@ecolights.io",
      address: "15 Solar Dr, San Jose, CA 95110, USA",
      phone: "+1 408-555-1200",
    },
    billTo: {
      name: "Green Building Corp",
      email: "pay@greenbuild.org",
      address: "800 Eco Ave, Portland, OR 97201, USA",
      phone: "+1 503-555-4411",
    },
    items: [
      { description: "LED Panel Arrays", shipmentType: "Express Courier", price: 395.0, qty: 2, amount: 790.0 },
    ],
    subTotal: 790.0,
    tax: 63.2,
    fee: 10.0,
    total: 863.2,
    note: "Paid.",
  },
  {
    id: "INV-1007",
    company: "GreenHaven",
    shippingId: "#SH8967432",
    issueDate: "Mar 14, 2035",
    dueDate: "Mar 21, 2035",
    amount: 875.0,
    status: "Paid",
    billFrom: {
      name: "GreenHaven",
      email: "info@greenhaven.com",
      address: "60 Garden St, Atlanta, GA 30301, USA",
      phone: "+1 404-555-6677",
    },
    billTo: {
      name: "ShipNow Logistics",
      email: "accounts@shipnow.com",
      address: "901 Distribution Ave, Charlotte, NC 28217, USA",
      phone: "+1 704-555-9911",
    },
    items: [
      { description: "Botanical Nursery Supply", shipmentType: "Standard Freight", price: 875.0, qty: 1, amount: 875.0 },
    ],
    subTotal: 875.0,
    tax: 70.0,
    fee: 10.0,
    total: 955.0,
    note: "Paid.",
  },
  {
    id: "INV-1008",
    company: "ModaWear",
    shippingId: "#SH8893247",
    issueDate: "Mar 16, 2035",
    dueDate: "Mar 23, 2035",
    amount: 910.0,
    status: "Unpaid",
    billFrom: {
      name: "ModaWear",
      email: "billing@modawear.com",
      address: "89 Franklin St, Boston, MA 02110, USA",
      phone: "+1 617-555-2290",
    },
    billTo: {
      name: "ShipNow Logistics",
      email: "accounts@shipnow.com",
      address: "901 Distribution Ave, Charlotte, NC 28217, USA",
      phone: "+1 704-555-9911",
    },
    items: [
      { description: "Lightweight Hoodie Pack", shipmentType: "Road Freight Express", price: 120.0, qty: 3, amount: 360.0 },
      { description: "Autumn Jacket Set", shipmentType: "Road Freight Standard", price: 180.0, qty: 2, amount: 360.0 },
      { description: "Lightweight Hoodie Pack", shipmentType: "Road Freight Express", price: 95.0, qty: 2, amount: 190.0 },
    ],
    subTotal: 910.0,
    tax: 72.8,
    fee: 10.0,
    total: 992.8,
    note: "Please process payment by the due date to avoid delivery disruption. Late fees may apply after 3 business days past due.",
  },
  {
    id: "INV-1009",
    company: "SunCore Panels",
    shippingId: "#SH9018723",
    issueDate: "Mar 17, 2035",
    dueDate: "Mar 24, 2035",
    amount: 1600.0,
    status: "Unpaid",
    billFrom: {
      name: "SunCore Panels",
      email: "billing@suncore.com",
      address: "200 Energy Way, Phoenix, AZ 85001, USA",
      phone: "+1 602-555-7890",
    },
    billTo: {
      name: "Solar Grid Ltd",
      email: "invoices@solargrid.com",
      address: "400 Power Rd, Las Vegas, NV 89101, USA",
      phone: "+1 702-555-1122",
    },
    items: [
      { description: "Monocrystalline Solar Cells", shipmentType: "Fragile Air Cargo", price: 800.0, qty: 2, amount: 1600.0 },
    ],
    subTotal: 1600.0,
    tax: 128.0,
    fee: 25.0,
    total: 1753.0,
    note: "Payment due upon receipt.",
  },
  {
    id: "INV-1010",
    company: "VitaFresh",
    shippingId: "#SH8881190",
    issueDate: "Mar 15, 2035",
    dueDate: "Mar 22, 2035",
    amount: 1120.0,
    status: "Overdue",
    billFrom: {
      name: "VitaFresh",
      email: "orders@vitafresh.com",
      address: "99 Health Ave, Minneapolis, MN 55401, USA",
      phone: "+1 612-555-4321",
    },
    billTo: {
      name: "NutriLife Outlets",
      email: "finance@nutrilife.com",
      address: "300 Wellness St, Columbus, OH 43215, USA",
      phone: "+1 614-555-9000",
    },
    items: [
      { description: "Vitamin Beverage Concentrate", shipmentType: "Refrigerated Truck", price: 280.0, qty: 4, amount: 1120.0 },
    ],
    subTotal: 1120.0,
    tax: 89.6,
    fee: 15.0,
    total: 1224.6,
    note: "OVERDUE: Please clear balance immediately.",
  },
  {
    id: "INV-1011",
    company: "SmartAppliance",
    shippingId: "#SH8923752",
    issueDate: "Mar 18, 2035",
    dueDate: "Mar 25, 2035",
    amount: 1050.0,
    status: "Paid",
    billFrom: {
      name: "SmartAppliance",
      email: "finance@smartapp.com",
      address: "50 Tech Park, San Jose, CA 95112, USA",
      phone: "+1 408-555-8800",
    },
    billTo: {
      name: "ShipNow Logistics",
      email: "accounts@shipnow.com",
      address: "901 Distribution Ave, Charlotte, NC 28217, USA",
      phone: "+1 704-555-9911",
    },
    items: [
      { description: "IoT Kitchen Hub Controller", shipmentType: "Express Freight", price: 525.0, qty: 2, amount: 1050.0 },
    ],
    subTotal: 1050.0,
    tax: 84.0,
    fee: 10.0,
    total: 1144.0,
    note: "Paid in full via credit card.",
  },
];

export default function BillingFinance() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("INV-1008");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>(["INV-1008"]);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Invoice Form state
  const [newCompany, setNewCompany] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id === selectedInvoiceId) || invoices[0],
    [invoices, selectedInvoiceId]
  );

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.shippingId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || inv.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Calculated Metrics
  const metrics = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "Paid");
    const unpaid = invoices.filter((i) => i.status === "Unpaid");
    const pending = invoices.filter((i) => i.status === "Pending");
    const overdue = invoices.filter((i) => i.status === "Overdue");

    const paidTotal = paid.reduce((acc, i) => acc + i.amount, 0);
    const unpaidTotal = unpaid.reduce((acc, i) => acc + i.amount, 0);
    const pendingTotal = pending.reduce((acc, i) => acc + i.amount, 0);
    const overdueTotal = overdue.reduce((acc, i) => acc + i.amount, 0);

    return {
      paidCount: paid.length || 350,
      paidAmount: paidTotal || 28890,
      unpaidCount: unpaid.length || 120,
      unpaidAmount: unpaidTotal || 16700,
      pendingCount: pending.length || 80,
      pendingAmount: pendingTotal || 8050,
      overdueCount: overdue.length || 245,
      overdueAmount: overdueTotal || 22110,
    };
  }, [invoices]);

  const handleSelectRow = (id: string) => {
    setSelectedInvoiceId(id);
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
  };

  const handleToggleCheckbox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success(`Copied ${id} to clipboard!`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newAmount) {
      toast.error("Please enter company name and amount.");
      return;
    }
    const nextNum = 1000 + invoices.length + 1;
    const newId = `INV-${nextNum}`;
    const amountVal = parseFloat(newAmount) || 1000;
    const newInv: Invoice = {
      id: newId,
      company: newCompany,
      shippingId: `#SH${Math.floor(10000000 + Math.random() * 90000000)}`,
      issueDate: "Mar 18, 2035",
      dueDate: newDueDate || "Mar 25, 2035",
      amount: amountVal,
      status: "Unpaid",
      billFrom: {
        name: newCompany,
        email: `billing@${newCompany.toLowerCase().replace(/[^a-z]/g, "")}.com`,
        address: "100 Innovation Way, Enterprise City, USA",
        phone: "+1 555-0199",
      },
      billTo: {
        name: "ShipNow Logistics",
        email: "accounts@shipnow.com",
        address: "901 Distribution Ave, Charlotte, NC 28217, USA",
        phone: "+1 704-555-9911",
      },
      items: [
        {
          description: "Enterprise Package Shipment",
          shipmentType: "Road Freight Express",
          price: amountVal,
          qty: 1,
          amount: amountVal,
        },
      ],
      subTotal: amountVal,
      tax: Math.round(amountVal * 0.08 * 100) / 100,
      fee: 10.0,
      total: Math.round((amountVal + amountVal * 0.08 + 10.0) * 100) / 100,
      note: "Please process payment by due date.",
    };

    setInvoices([newInv, ...invoices]);
    setSelectedInvoiceId(newId);
    setSelectedIds([newId]);
    setShowNewModal(false);
    setNewCompany("");
    setNewAmount("");
    toast.success(`Invoice ${newId} created successfully!`);
  };

  const getStatusBadgeStyle = (status: Invoice["status"]) => {
    switch (status) {
      case "Paid":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "Unpaid":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          border: "rgba(239, 68, 68, 0.25)",
        };
      case "Overdue":
        return {
          bg: "rgba(245, 158, 11, 0.15)",
          color: "#f59e0b",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "Pending":
      default:
        return {
          bg: "rgba(107, 114, 128, 0.15)",
          color: "#9ca3af",
          border: "rgba(107, 114, 128, 0.3)",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Invoices & Billing
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Dashboard <span className="mx-1">/</span> Invoices & Billing
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#f59e0b] transition-colors"
          />
        </div>
      </div>

      {/* ── Top Metric KPI Cards Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Paid Invoices */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between shadow-sm"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Paid Invoices
            </span>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              ${metrics.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              from <span className="font-semibold text-emerald-400">{metrics.paidCount}</span> Invoices
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
            <CheckCircle2 size={24} />
          </div>
        </motion.div>

        {/* Unpaid Invoices */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between shadow-sm"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Unpaid Invoices
            </span>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              ${metrics.unpaidAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              from <span className="font-semibold text-red-400">{metrics.unpaidCount}</span> Invoices
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
            <XCircle size={24} />
          </div>
        </motion.div>

        {/* Pending Invoices */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between shadow-sm"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Pending Invoices
            </span>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              ${metrics.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              from <span className="font-semibold text-amber-400">{metrics.pendingCount}</span> Invoices
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
            <Clock size={24} />
          </div>
        </motion.div>

        {/* Overdue Invoices */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between shadow-sm"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Overdue Invoices
            </span>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              ${metrics.overdueAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              from <span className="font-semibold text-orange-400">{metrics.overdueCount}</span> Invoices
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
            <AlertTriangle size={24} />
          </div>
        </motion.div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Invoices Table Panel (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden">
          {/* Table Control Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Invoices</h2>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  placeholder="Search invoices"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#f59e0b]"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="OVERDUE">Overdue</option>
              </select>

              <button
                onClick={() => setShowNewModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus size={14} /> New Invoice
              </button>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] font-medium">
                  <th className="py-3 px-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={() => {
                        if (selectedIds.length === filteredInvoices.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(filteredInvoices.map((i) => i.id));
                        }
                      }}
                      className="rounded border-[var(--border-color)] accent-[#f59e0b]"
                    />
                  </th>
                  <th className="py-3 px-2 font-semibold">
                    <div className="flex items-center gap-1">Invoice ID <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="py-3 px-2 font-semibold">
                    <div className="flex items-center gap-1">Company <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="py-3 px-2 font-semibold">Shipping ID</th>
                  <th className="py-3 px-2 font-semibold">
                    <div className="flex items-center gap-1">Date <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="py-3 px-2 font-semibold text-right">
                    <div className="flex items-center justify-end gap-1">Amount <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="py-3 px-2 font-semibold text-center">
                    <div className="flex items-center justify-center gap-1">Status <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-color)]/50">
                {filteredInvoices.map((inv) => {
                  const isSelected = inv.id === selectedInvoiceId;
                  const isChecked = selectedIds.includes(inv.id);
                  const statusStyle = getStatusBadgeStyle(inv.status);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleSelectRow(inv.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-red-500/10 dark:bg-red-500/15"
                          : "hover:bg-[var(--bg-dark)]/50"
                      }`}
                    >
                      <td className="py-3.5 px-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => handleToggleCheckbox(e, inv.id)}
                          readOnly
                          className="rounded border-[var(--border-color)] accent-[#f59e0b]"
                        />
                      </td>

                      <td className="py-3.5 px-2 font-semibold text-red-500 dark:text-red-400">
                        <div className="flex items-center gap-1">
                          <span>{inv.id}</span>
                          <button
                            onClick={(e) => handleCopyId(e, inv.id)}
                            className="p-1 hover:text-[var(--text-primary)] text-[var(--text-secondary)] rounded transition-colors"
                            title="Copy Invoice ID"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[10px] font-bold">
                            {inv.company.charAt(0)}
                          </div>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {inv.company}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-2 text-[var(--text-secondary)] font-mono text-[11px]">
                        {inv.shippingId}
                      </td>

                      <td className="py-3.5 px-2 text-[var(--text-secondary)] text-[11px] leading-snug">
                        <div>{inv.issueDate} <span className="opacity-60">(Issued)</span></div>
                        <div className="text-[10px] opacity-75">{inv.dueDate} <span className="opacity-60">(Due)</span></div>
                      </td>

                      <td className="py-3.5 px-2 text-right font-bold text-[var(--text-primary)]">
                        ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-2 text-center">
                        <span
                          className="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            borderColor: statusStyle.border,
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Invoice Details Panel (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-5">
          {/* Header Actions */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Invoice Details
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info(`Editing invoice ${selectedInvoice.id}`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--border-color)]/30 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => toast.warning(`Invoice ${selectedInvoice.id} placed on hold.`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--border-color)]/30 transition-colors"
              >
                Hold
              </button>
              <button
                onClick={() => toast.success(`Invoice ${selectedInvoice.id} sent to ${selectedInvoice.billTo.email}`)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send size={12} /> Send Invoice
              </button>
            </div>
          </div>

          {/* Selected Invoice Banner */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-[var(--text-primary)]">
                  Invoice #{selectedInvoice.id}
                </span>
                <span
                  className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border"
                  style={{
                    backgroundColor: getStatusBadgeStyle(selectedInvoice.status).bg,
                    color: getStatusBadgeStyle(selectedInvoice.status).color,
                    borderColor: getStatusBadgeStyle(selectedInvoice.status).border,
                  }}
                >
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div className="text-right text-xs text-[var(--text-secondary)] space-y-0.5">
              <div>Issue Date <span className="font-semibold text-[var(--text-primary)]">{selectedInvoice.issueDate}</span></div>
              <div>Due Date <span className="font-semibold text-[var(--text-primary)]">{selectedInvoice.dueDate}</span></div>
            </div>
          </div>

          {/* Bill From / Bill To Card Block */}
          <div className="p-4 rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)] grid grid-cols-2 gap-4 text-xs">
            {/* Bill From */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Bill From
              </span>
              <div className="font-bold text-sm text-[var(--text-primary)]">
                {selectedInvoice.billFrom.name}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] truncate">
                {selectedInvoice.billFrom.email}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] leading-tight">
                {selectedInvoice.billFrom.address}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] font-mono">
                {selectedInvoice.billFrom.phone}
              </div>
            </div>

            {/* Bill To */}
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Bill To
              </span>
              <div className="font-bold text-sm text-[var(--text-primary)]">
                {selectedInvoice.billTo.name}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] truncate">
                {selectedInvoice.billTo.email}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] leading-tight">
                {selectedInvoice.billTo.address}
              </div>
              <div className="text-[var(--text-secondary)] text-[11px] font-mono">
                {selectedInvoice.billTo.phone}
              </div>
            </div>
          </div>

          {/* Package Summary Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Package Summary
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[11px]">
                    <th className="py-2 px-2 font-semibold">Description</th>
                    <th className="py-2 px-2 font-semibold">Shipment Type</th>
                    <th className="py-2 px-2 font-semibold text-right">Price</th>
                    <th className="py-2 px-2 font-semibold text-center">Qty</th>
                    <th className="py-2 px-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-color)]/40">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx} className="text-[var(--text-primary)]">
                      <td className="py-2.5 px-2 font-medium">{item.description}</td>
                      <td className="py-2.5 px-2 text-[var(--text-secondary)] text-[11px]">
                        {item.shipmentType}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold">{item.qty}</td>
                      <td className="py-2.5 px-2 text-right font-bold">
                        ${item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-[var(--border-color)] space-y-1.5 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between items-center">
                <span>Sub Total</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  ${selectedInvoice.subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax (8%)</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  ${selectedInvoice.tax.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Fee</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  ${selectedInvoice.fee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)] text-sm font-extrabold text-[var(--text-primary)]">
                <span>Total</span>
                <span className="text-base text-[#f59e0b]">
                  ${selectedInvoice.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Note Block */}
          {selectedInvoice.note && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
              <span className="font-bold block mb-0.5">Note:</span>
              {selectedInvoice.note}
            </div>
          )}
        </div>
      </div>

      {/* ── New Invoice Modal ── */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Create New Invoice</h3>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
                <div>
                  <label className="block mb-1 font-semibold text-[var(--text-secondary)]">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Co."
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-[var(--text-secondary)]">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1250.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-[var(--text-secondary)]">Due Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Mar 30, 2035"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 font-semibold rounded-xl bg-[var(--bg-dark)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black transition-colors"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
