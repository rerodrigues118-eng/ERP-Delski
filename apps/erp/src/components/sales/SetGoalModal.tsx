import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSalesGoal } from "@/hooks/useSales";
import { GoalPeriodType } from "@/types/sales";
import { toast } from "sonner";
import { Target, DollarSign, Calendar, Users } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

const setGoalSchema = z.object({
  period_type: z.enum(["weekly", "monthly"] as const),
  target_amount: z.coerce.number().positive("O valor da meta deve ser maior que zero"),
  team_name: z.string().min(2, "Nome da equipe ou vendedor é obrigatório"),
  start_date: z.string().min(1, "Data inicial é obrigatória"),
  end_date: z.string().min(1, "Data final é obrigatória"),
});

type SetGoalFormValues = z.infer<typeof setGoalSchema>;

// IMPORTANT (AGENTS.md Rule 1): Resolver declared in module scope
const setGoalResolver = zodResolver(setGoalSchema);

interface SetGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod?: GoalPeriodType;
}

export function SetGoalModal({ open, onOpenChange, defaultPeriod = "monthly" }: SetGoalModalProps) {
  const createGoalMutation = useCreateSalesGoal();
  const now = new Date();

  const initialStartDate =
    defaultPeriod === "weekly"
      ? format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(startOfMonth(now), "yyyy-MM-dd");

  const initialEndDate =
    defaultPeriod === "weekly"
      ? format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(endOfMonth(now), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetGoalFormValues>({
    resolver: setGoalResolver,
    defaultValues: {
      period_type: defaultPeriod,
      target_amount: defaultPeriod === "weekly" ? 15000 : 60000,
      team_name: "Time Comercial Delski",
      start_date: initialStartDate,
      end_date: initialEndDate,
    },
  });

  const selectedPeriod = watch("period_type");

  const handlePeriodChange = (val: GoalPeriodType) => {
    setValue("period_type", val);
    if (val === "weekly") {
      setValue("target_amount", 15000);
      setValue("start_date", format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setValue("end_date", format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
    } else {
      setValue("target_amount", 60000);
      setValue("start_date", format(startOfMonth(now), "yyyy-MM-dd"));
      setValue("end_date", format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  const onSubmit = async (data: SetGoalFormValues) => {
    try {
      await createGoalMutation.mutateAsync({
        ...data,
        current_amount: 0,
      });
      toast.success("Nova meta de vendas configurada com sucesso!");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar meta. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Target className="h-5 w-5 text-primary" />
            Configurar Meta de Vendas
          </DialogTitle>
          <DialogDescription>
            Estabeleça a meta de receita para a equipe comercial ou vendedor no período.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Tipo de Período */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Período da Meta *</Label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal (7 dias)</SelectItem>
                <SelectItem value="monthly">Mensal (Mês Corrente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor Alvo */}
          <div className="space-y-1.5">
            <Label htmlFor="target_amount" className="text-xs font-semibold">
              Valor Alvo da Meta (R$) *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="target_amount"
                type="number"
                step="100"
                placeholder="60000.00"
                className="pl-9"
                {...register("target_amount")}
              />
            </div>
            {errors.target_amount && (
              <p className="text-xs text-destructive font-medium">{errors.target_amount.message}</p>
            )}
          </div>

          {/* Equipe / Responsável */}
          <div className="space-y-1.5">
            <Label htmlFor="team_name" className="text-xs font-semibold">
              Equipe ou Responsável *
            </Label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="team_name"
                placeholder="Ex: Time Comercial Delski"
                className="pl-9"
                {...register("team_name")}
              />
            </div>
            {errors.team_name && (
              <p className="text-xs text-destructive font-medium">{errors.team_name.message}</p>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs font-semibold">
                Data Inicial *
              </Label>
              <Input id="start_date" type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="text-xs text-destructive font-medium">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs font-semibold">
                Data Final *
              </Label>
              <Input id="end_date" type="date" {...register("end_date")} />
              {errors.end_date && (
                <p className="text-xs text-destructive font-medium">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createGoalMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {createGoalMutation.isPending ? "Salvando..." : "Definir Meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
