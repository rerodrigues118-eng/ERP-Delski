import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  PlusCircle,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  FileSpreadsheet,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sale, SaleStatus, SalesChannel } from "@/types/sales";
import { useUpdateSaleStatus, useDeleteSale } from "@/hooks/useSales";
import { toast } from "sonner";
import { format, parseISO, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesTableProps {
  sales: Sale[];
  isLoading: boolean;
  onOpenNewSaleModal: () => void;
}

const STATUS_CONFIG: Record<
  SaleStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  concluida: {
    label: "Concluída",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  em_negociacao: {
    label: "Em Negociação",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    icon: Clock,
  },
  cancelada: {
    label: "Cancelada",
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
    icon: XCircle,
  },
};

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  inbound: "Inbound",
  sdr_whatsapp: "SDR WhatsApp",
  indicacao: "Indicação",
  parceiros: "Parceiros",
  outbound: "Outbound",
  outro: "Outro",
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

export function SalesTable({ sales, isLoading, onOpenNewSaleModal }: SalesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const updateStatusMutation = useUpdateSaleStatus();
  const deleteSaleMutation = useDeleteSale();

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesClient = sale.client_name.toLowerCase().includes(query);
        const matchesService = sale.service_name.toLowerCase().includes(query);
        const matchesSeller = (sale.seller_name || "").toLowerCase().includes(query);
        if (!matchesClient && !matchesService && !matchesSeller) return false;
      }

      // 2. Status
      if (statusFilter !== "all" && sale.status !== statusFilter) {
        return false;
      }

      // 3. Channel
      if (channelFilter !== "all" && sale.channel !== channelFilter) {
        return false;
      }

      // 4. Period
      if (periodFilter === "this_week") {
        const date = parseISO(sale.created_at);
        if (!isThisWeek(date, { weekStartsOn: 1 })) return false;
      } else if (periodFilter === "this_month") {
        const date = parseISO(sale.created_at);
        if (!isThisMonth(date)) return false;
      }

      return true;
    });
  }, [sales, search, statusFilter, periodFilter, channelFilter]);

  // Export to CSV Function
  const handleExportCSV = () => {
    try {
      const headers = [
        "ID",
        "Cliente",
        "Serviço",
        "Valor (R$)",
        "Status",
        "Canal",
        "Condição de Pagamento",
        "Vendedor",
        "Data de Registro",
      ];

      const rows = filteredSales.map((s) => [
        `"${s.id}"`,
        `"${s.client_name}"`,
        `"${s.service_name}"`,
        `"${s.amount.toFixed(2)}"`,
        `"${STATUS_CONFIG[s.status]?.label || s.status}"`,
        `"${CHANNEL_LABELS[s.channel] || s.channel}"`,
        `"${s.payment_terms || "À vista"}"`,
        `"${s.seller_name || "N/A"}"`,
        `"${format(parseISO(s.created_at), "dd/MM/yyyy HH:mm")}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `relatorio_vendas_delski_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório de vendas exportado com sucesso (CSV)!");
    } catch (err) {
      toast.error("Erro ao gerar relatório CSV.");
    }
  };

  const handleStatusChange = async (saleId: string, newStatus: SaleStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: saleId, status: newStatus });
      toast.success("Status da venda atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar status da venda.");
    }
  };

  const handleDelete = async (saleId: string) => {
    if (confirm("Tem certeza que deseja excluir este registro de venda?")) {
      try {
        await deleteSaleMutation.mutateAsync(saleId);
        toast.success("Registro de venda excluído.");
      } catch (err) {
        toast.error("Erro ao excluir venda.");
      }
    }
  };

  const openDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, serviço ou vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card border-border shadow-xs"
          />
        </div>

        {/* Filter dropdowns and action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period filter */}
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl bg-card">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="this_week">Esta Semana</SelectItem>
              <SelectItem value="this_month">Este Mês</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="em_negociacao">Em Negociação</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          {/* Channel filter */}
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl bg-card">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Canais</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="sdr_whatsapp">SDR Whats</SelectItem>
              <SelectItem value="indicacao">Indicação</SelectItem>
              <SelectItem value="parceiros">Parceiros</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Report Button */}
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="h-10 gap-1.5 rounded-xl border-border bg-card hover:bg-accent font-semibold shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Relatório</span>
          </Button>

          {/* New Sale Button */}
          <Button
            onClick={onOpenNewSaleModal}
            className="h-10 gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      {/* Styled Data Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
              <tr>
                <th className="py-3.5 px-4">Cliente / Razão</th>
                <th className="py-3.5 px-4">Serviço / Produto</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Canal</th>
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-sm">Nenhum registro de venda encontrado</p>
                    <p className="text-xs pt-1">
                      Tente alterar os filtros ou clique em "+ Nova Venda" para registrar.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const statusInfo = STATUS_CONFIG[sale.status] || STATUS_CONFIG.concluida;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Building className="h-3.5 w-3.5" />
                          </div>
                          <span>{sale.client_name}</span>
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {sale.service_name}
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(sale.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-bold text-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(sale.amount)}
                      </td>

                      {/* Canal */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border">
                          {CHANNEL_LABELS[sale.channel] || sale.channel}
                        </span>
                      </td>

                      {/* Vendedor */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground font-medium">
                        {sale.seller_name || "Comercial"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <StatusIcon className="h-3 w-3 shrink-0" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openDetails(sale)}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sale.id, "concluida")}
                              disabled={sale.status === "concluida"}
                              className="text-emerald-600 focus:text-emerald-700"
                            >
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              Marcar Concluída
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sale.id, "em_negociacao")}
                              disabled={sale.status === "em_negociacao"}
                              className="text-amber-600 focus:text-amber-700"
                            >
                              <Clock className="mr-2 h-3.5 w-3.5" />
                              Em Negociação
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sale.id, "cancelada")}
                              disabled={sale.status === "cancelada"}
                              className="text-rose-600 focus:text-rose-700"
                            >
                              <XCircle className="mr-2 h-3.5 w-3.5" />
                              Marcar Cancelada
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(sale.id)}
                              className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Excluir Registro
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Counter */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
          <span>
            Mostrando <strong>{filteredSales.length}</strong> de <strong>{sales.length}</strong> vendas registradas
          </span>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                {selectedSale.client_name}
              </DialogTitle>
              <DialogDescription>
                Registro comercial ID: <span className="font-mono text-xs">{selectedSale.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Serviço:</span>
                <span className="font-bold text-foreground">{selectedSale.service_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Valor:</span>
                <span className="font-bold text-foreground text-sm">
                  {formatCurrency(selectedSale.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Status:</span>
                <span className="font-bold uppercase tracking-wider">{selectedSale.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Canal de Origem:</span>
                <span className="font-bold">{CHANNEL_LABELS[selectedSale.channel]}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Condições de Pagamento:</span>
                <span className="font-bold">{selectedSale.payment_terms || "À vista"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Vendedor:</span>
                <span className="font-bold">{selectedSale.seller_name || "Comercial"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium">Data de Cadastro:</span>
                <span>{format(parseISO(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
              </div>
              {selectedSale.notes && (
                <div className="pt-2">
                  <span className="text-muted-foreground font-medium block mb-1">Observações:</span>
                  <p className="p-2.5 rounded-lg bg-muted/60 text-foreground text-xs leading-relaxed">
                    {selectedSale.notes}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
