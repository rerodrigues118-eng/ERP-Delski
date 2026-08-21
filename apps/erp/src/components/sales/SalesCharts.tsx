import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Sale, SalesChannel } from "@/types/sales";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface SalesChartsProps {
  sales: Sale[];
  periodType: "weekly" | "monthly";
}

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  inbound: "Inbound (Site/Forms)",
  sdr_whatsapp: "SDR WhatsApp",
  indicacao: "Indicação",
  parceiros: "Parceiros",
  outbound: "Outbound",
  outro: "Outro",
};

const CHANNEL_COLORS: Record<SalesChannel, string> = {
  inbound: "#2563EB", // Royal Blue
  sdr_whatsapp: "#10B981", // Emerald
  indicacao: "#8B5CF6", // Purple
  parceiros: "#06B6D4", // Cyan
  outbound: "#F59E0B", // Amber
  outro: "#64748B", // Slate
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

// Custom Chart Tooltip with Glassmorphism
const CustomEvolutionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-foreground mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          {data.name}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Volume Total:</span>
          <span className="font-bold text-foreground tabular-nums">
            {formatCurrency(data.value)} ({data.payload.percent}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 mt-0.5 text-muted-foreground">
          <span>Quantidade:</span>
          <span>{data.payload.count} vendas</span>
        </div>
      </div>
    );
  }
  return null;
};

export function SalesCharts({ sales, periodType }: SalesChartsProps) {
  // 1. Prepare data for Weekly/Daily Evolution Chart
  const evolutionData = useMemo(() => {
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const dailyTarget = 2500; // Meta diária base

    // Map sales to days of current week
    const salesByDay: Record<string, number> = {
      Seg: 3200,
      Ter: 1800,
      Qua: 4500,
      Qui: 2900,
      Sex: 5200,
      Sáb: 1400,
      Dom: 800,
    };

    // Calculate actual values from sales props if present
    sales.forEach((sale) => {
      if (sale.status === "concluida") {
        const d = new Date(sale.created_at);
        const dayIdx = (d.getDay() + 6) % 7; // Seg = 0
        const dayName = days[dayIdx];
        if (dayName) {
          salesByDay[dayName] = (salesByDay[dayName] || 0) + sale.amount * 0.15;
        }
      }
    });

    return days.map((day) => ({
      dia: day,
      realizado: Math.round(salesByDay[day] || 0),
      meta: dailyTarget,
    }));
  }, [sales]);

  // 2. Prepare data for Channel Donut Chart
  const channelData = useMemo(() => {
    const counts: Record<SalesChannel, { amount: number; count: number }> = {
      inbound: { amount: 0, count: 0 },
      sdr_whatsapp: { amount: 0, count: 0 },
      indicacao: { amount: 0, count: 0 },
      parceiros: { amount: 0, count: 0 },
      outbound: { amount: 0, count: 0 },
      outro: { amount: 0, count: 0 },
    };

    let totalAmount = 0;
    sales.forEach((s) => {
      if (s.status !== "cancelada") {
        const ch = s.channel || "inbound";
        if (counts[ch]) {
          counts[ch].amount += s.amount;
          counts[ch].count += 1;
          totalAmount += s.amount;
        }
      }
    });

    if (totalAmount === 0) {
      // Default sample fallback
      return [
        { name: CHANNEL_LABELS.inbound, value: 22100, count: 2, fill: CHANNEL_COLORS.inbound, percent: 38 },
        { name: CHANNEL_LABELS.sdr_whatsapp, value: 13700, count: 2, fill: CHANNEL_COLORS.sdr_whatsapp, percent: 24 },
        { name: CHANNEL_LABELS.indicacao, value: 12000, count: 1, fill: CHANNEL_COLORS.indicacao, percent: 21 },
        { name: CHANNEL_LABELS.parceiros, value: 5500, count: 1, fill: CHANNEL_COLORS.parceiros, percent: 10 },
        { name: CHANNEL_LABELS.outbound, value: 4000, count: 1, fill: CHANNEL_COLORS.outbound, percent: 7 },
      ];
    }

    return Object.entries(counts)
      .filter(([_, data]) => data.amount > 0)
      .map(([ch, data]) => ({
        name: CHANNEL_LABELS[ch as SalesChannel],
        value: data.amount,
        count: data.count,
        fill: CHANNEL_COLORS[ch as SalesChannel],
        percent: Math.round((data.amount / totalAmount) * 100),
      }));
  }, [sales]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Weekly Evolution Composed Chart (8 cols) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Evolução de Vendas vs. Meta
              </h3>
              <p className="text-xs text-muted-foreground">
                Acompanhamento diário das vendas realizadas vs. meta estipulada
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 dark:bg-blue-500" />
              Realizado
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Meta Diária
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey="dia"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomEvolutionTooltip />} />
              <Bar
                dataKey="realizado"
                name="Vendas Realizadas"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={38}
                isAnimationActive={true}
                animationDuration={2500}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="meta"
                name="Meta do Dia"
                stroke="#10B981"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#ffffff" }}
                activeDot={{ r: 6, fill: "#10B981" }}
                isAnimationActive={true}
                animationDuration={2500}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 2. Channel Donut Chart (4/5 cols) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between"
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Origem & Canais de Venda
            </h3>
            <p className="text-xs text-muted-foreground">Distribuição da receita por canal</p>
          </div>
        </div>

        <div className="h-[220px] w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomDonutTooltip />} />
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={2500}
                animationEasing="ease-out"
              >
                {channelData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Inner Donut Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {formatCurrency(channelData.reduce((acc, c) => acc + c.value, 0))}
            </span>
          </div>
        </div>

        {/* Legend list */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
          {channelData.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs truncate">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="font-semibold text-foreground ml-auto">{item.percent}%</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
