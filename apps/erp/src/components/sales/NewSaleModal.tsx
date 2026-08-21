import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSale } from "@/hooks/useSales";
import { SaleStatus, SalesChannel } from "@/types/sales";
import { toast } from "sonner";
import { DollarSign, User, Briefcase, CreditCard, Tag } from "lucide-react";

const newSaleSchema = z.object({
  client_name: z.string().min(2, "Nome do cliente é obrigatório"),
  service_name: z.string().min(2, "Nome do serviço é obrigatório"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  status: z.enum(["concluida", "em_negociacao", "cancelada"] as const),
  channel: z.enum(["inbound", "sdr_whatsapp", "indicacao", "parceiros", "outbound", "outro"] as const),
  payment_terms: z.string().min(1, "Condição de pagamento é obrigatória"),
  seller_name: z.string().min(2, "Nome do vendedor é obrigatório"),
  notes: z.string().optional(),
});

export type NewSaleFormValues = z.infer<typeof newSaleSchema>;

// IMPORTANT (AGENTS.md Rule 1): Resolver declared in module scope to prevent CPU lockup loop
const newSaleResolver = zodResolver(newSaleSchema);

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<NewSaleFormValues>;
  onSuccessCallback?: () => void;
}

export function NewSaleModal({ open, onOpenChange, initialValues, onSuccessCallback }: NewSaleModalProps) {
  const createSaleMutation = useCreateSale();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewSaleFormValues>({
    resolver: newSaleResolver,
    defaultValues: {
      client_name: "",
      service_name: "Consultoria em IA & Automação",
      amount: 0,
      status: "concluida",
      channel: "inbound",
      payment_terms: "À vista (PIX)",
      seller_name: "Gestor Comercial",
      notes: "",
    },
  });

  useEffect(() => {
    if (open && initialValues) {
      reset({
        client_name: initialValues.client_name ?? "",
        service_name: initialValues.service_name ?? "Consultoria em IA & Automação",
        amount: initialValues.amount ?? 0,
        status: initialValues.status ?? "concluida",
        channel: initialValues.channel ?? "inbound",
        payment_terms: initialValues.payment_terms ?? "À vista (PIX)",
        seller_name: initialValues.seller_name ?? "Gestor Comercial",
        notes: initialValues.notes ?? "",
      });
    }
  }, [open, initialValues, reset]);

  const selectedStatus = watch("status");
  const selectedChannel = watch("channel");

  const onSubmit = async (data: NewSaleFormValues) => {
    try {
      await createSaleMutation.mutateAsync(data);
      toast.success("Venda registrada com sucesso no ERP!");
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao registrar venda. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Nova Venda
          </DialogTitle>
          <DialogDescription>
            Insira os dados da transação comercial para sincronização com o faturamento e metas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome do Cliente */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="client_name" className="text-xs font-semibold">
                Nome do Cliente / Empresa *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="client_name"
                  placeholder="Ex: Nexus Tech Soluções"
                  className="pl-9 text-xs"
                  {...register("client_name")}
                />
              </div>
              {errors.client_name && (
                <p className="text-xs text-destructive font-medium">{errors.client_name.message}</p>
              )}
            </div>

            {/* Serviço/Produto */}
            <div className="space-y-1.5">
              <Label htmlFor="service_name" className="text-xs font-semibold">
                Serviço / Produto *
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="service_name"
                  placeholder="Ex: Automação IA"
                  className="pl-9 text-xs"
                  {...register("service_name")}
                />
              </div>
              {errors.service_name && (
                <p className="text-xs text-destructive font-medium">{errors.service_name.message}</p>
              )}
            </div>

            {/* Valor (R$) */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Valor Total (R$) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9 text-xs"
                  {...register("amount")}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>
              )}
            </div>

            {/* Canal de Origem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal / Origem do Lead *</Label>
              <Select
                value={selectedChannel}
                onValueChange={(val: SalesChannel) => setValue("channel", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (Site / Formulário)</SelectItem>
                  <SelectItem value="sdr_whatsapp">SDR WhatsApp</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="parceiros">Parceiros</SelectItem>
                  <SelectItem value="outbound">Outbound (Prospecção Ativa)</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status da Venda */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Inicial *</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val: SaleStatus) => setValue("status", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluida">Concluída (Fechada)</SelectItem>
                  <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                  <SelectItem value="cancelada">Cancelada / Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vendedor / Responsável */}
            <div className="space-y-1.5">
              <Label htmlFor="seller_name" className="text-xs font-semibold">
                Vendedor / Closer Responsável *
              </Label>
              <Input
                id="seller_name"
                placeholder="Ex: Carlos Eduardo"
                className="text-xs"
                {...register("seller_name")}
              />
              {errors.seller_name && (
                <p className="text-xs text-destructive font-medium">{errors.seller_name.message}</p>
              )}
            </div>

            {/* Condição de Pagamento */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_terms" className="text-xs font-semibold">
                Condição de Pagamento *
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payment_terms"
                  placeholder="Ex: À vista (PIX) ou 50/50"
                  className="pl-9 text-xs"
                  {...register("payment_terms")}
                />
              </div>
              {errors.payment_terms && (
                <p className="text-xs text-destructive font-medium">{errors.payment_terms.message}</p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Observações / Detalhes Adicionais
              </Label>
              <Textarea
                id="notes"
                placeholder="Detalhes sobre a negociação, expectativas ou escopo..."
                className="resize-none h-20 text-xs"
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createSaleMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {createSaleMutation.isPending ? "Salvando..." : "Registrar Venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
