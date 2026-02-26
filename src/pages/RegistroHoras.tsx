import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isMonday,
  isSaturday,
  isSunday,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const HORAS_PADRAO: Record<number, number> = {
  1: 8.75, // segunda
  2: 8.5,  // terça
  3: 8.5,  // quarta
  4: 8.5,  // quinta
  5: 8.5,  // sexta
  6: 0,    // sábado
  0: 0,    // domingo
};

type CellKey = string; // `${demanda_id}__${date}`
type CellData = {
  id?: string;
  horas: number | '';
  motivo_nao_trabalho_id: string | null;
};

const RegistroHoras = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [demandas, setDemandas] = useState<any[]>([]);
  const [cells, setCells] = useState<Record<CellKey, CellData>>({});
  const [motivos, setMotivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [naoTrabalhadoDia, setNaoTrabalhadoDia] = useState<Record<string, string | null>>({});

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const dateFrom = format(weekStart, 'yyyy-MM-dd');
    const dateTo = format(weekEnd, 'yyyy-MM-dd');

    const [demandasRes, horasRes, motivosRes] = await Promise.all([
      supabase
        .from('esquadro_demandas')
        .select(`
          id,
          empreendimento:esquadro_empreendimentos(nome),
          tipo_projeto:esquadro_tipos_projeto(nome),
          status:esquadro_status(nome)
        `)
        .order('prioridade'),
      supabase
        .from('esquadro_registro_horas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', dateFrom)
        .lte('data', dateTo),
      supabase
        .from('esquadro_motivos_nao_trabalho')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    setDemandas(demandasRes.data || []);
    setMotivos(motivosRes.data || []);

    // Build cells map
    const cellMap: Record<CellKey, CellData> = {};
    const naoTrab: Record<string, string | null> = {};

    (horasRes.data || []).forEach((r: any) => {
      if (r.demanda_id) {
        const key = `${r.demanda_id}__${r.data}`;
        cellMap[key] = {
          id: r.id,
          horas: r.horas ?? '',
          motivo_nao_trabalho_id: r.motivo_nao_trabalho_id,
        };
      } else if (r.motivo_nao_trabalho_id) {
        naoTrab[r.data] = r.motivo_nao_trabalho_id;
      }
    });

    setCells(cellMap);
    setNaoTrabalhadoDia(naoTrab);
    setLoading(false);
  }, [user, weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCell = (demandaId: string, date: string, horas: string) => {
    const key = `${demandaId}__${date}`;
    const val = horas === '' ? '' : parseFloat(horas);
    setCells((prev) => ({
      ...prev,
      [key]: { ...prev[key], horas: isNaN(val as number) ? '' : val },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const upserts: any[] = [];
    const existingIds: string[] = [];

    // Collect all cell data
    Object.entries(cells).forEach(([key, cell]) => {
      if (cell.horas === '' || cell.horas === 0) return;
      const [demanda_id, data] = key.split('__');
      if (cell.id) existingIds.push(cell.id);
      upserts.push({
        ...(cell.id ? { id: cell.id } : {}),
        demanda_id,
        user_id: user.id,
        data,
        horas: Number(cell.horas),
        motivo_nao_trabalho_id: null,
      });
    });

    // Delete existing records for this week first, then insert
    const dateFrom = format(weekStart, 'yyyy-MM-dd');
    const dateTo = format(weekEnd, 'yyyy-MM-dd');

    await supabase
      .from('esquadro_registro_horas')
      .delete()
      .eq('user_id', user.id)
      .gte('data', dateFrom)
      .lte('data', dateTo);

    if (upserts.length > 0) {
      const cleanUpserts = upserts.map(({ id, ...rest }) => rest);
      const { error } = await supabase
        .from('esquadro_registro_horas')
        .insert(cleanUpserts);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    toast({ title: 'Horas salvas com sucesso' });
    setSaving(false);
    fetchData();
  };

  const getDayTotal = (date: string) => {
    return Object.entries(cells)
      .filter(([key]) => key.endsWith(`__${date}`))
      .reduce((sum, [, cell]) => sum + (typeof cell.horas === 'number' ? cell.horas : 0), 0);
  };

  const getDemandaTotal = (demandaId: string) => {
    return Object.entries(cells)
      .filter(([key]) => key.startsWith(`${demandaId}__`))
      .reduce((sum, [, cell]) => sum + (typeof cell.horas === 'number' ? cell.horas : 0), 0);
  };

  const weekTotal = days.reduce((sum, day) => sum + getDayTotal(format(day, 'yyyy-MM-dd')), 0);
  const expectedTotal = days.reduce((sum, day) => sum + (HORAS_PADRAO[getDay(day)] || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro de Horas</h1>
          <p className="text-muted-foreground text-sm mt-1">Timesheet semanal</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[220px] text-center">
          {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} — {format(weekEnd, "dd 'de' MMMM yyyy", { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Timesheet table */}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[220px] sticky left-0 bg-muted z-10">
                Demanda
              </th>
              {days.map((day, i) => {
                const isWeekend = isSaturday(day) || isSunday(day);
                return (
                  <th
                    key={i}
                    className={`text-center px-2 py-3 font-medium min-w-[80px] ${
                      isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    }`}
                  >
                    <div>{DAY_NAMES_SHORT[i]}</div>
                    <div className="text-xs font-normal">{format(day, 'dd/MM')}</div>
                  </th>
                );
              })}
              <th className="text-center px-3 py-3 font-medium text-muted-foreground min-w-[70px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && demandas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma demanda encontrada.
                </td>
              </tr>
            )}
            {!loading &&
              demandas.map((d: any) => {
                const demandaTotal = getDemandaTotal(d.id);
                return (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-2 sticky left-0 bg-card z-10">
                      <p className="font-medium text-xs truncate max-w-[200px]">
                        {d.empreendimento?.nome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {d.tipo_projeto?.nome}
                      </p>
                    </td>
                    {days.map((day, i) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const key = `${d.id}__${dateStr}`;
                      const cell = cells[key];
                      const isWeekend = isSaturday(day) || isSunday(day);
                      return (
                        <td key={i} className={`px-1 py-2 text-center ${isWeekend ? 'bg-muted/30' : ''}`}>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={cell?.horas ?? ''}
                            onChange={(e) => updateCell(d.id, dateStr, e.target.value)}
                            className="w-16 mx-auto text-center h-8 text-xs tabular-nums"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-medium tabular-nums text-xs">
                      {demandaTotal > 0 ? `${demandaTotal}h` : '—'}
                    </td>
                  </tr>
                );
              })}

            {/* Totals row */}
            {!loading && demandas.length > 0 && (
              <tr className="border-t-2 border-primary/20 bg-muted/50 font-medium">
                <td className="px-4 py-3 sticky left-0 bg-muted/50 z-10 text-sm">Total do Dia</td>
                {days.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayTotal = getDayTotal(dateStr);
                  const expected = HORAS_PADRAO[getDay(day)] || 0;
                  const isOver = dayTotal > expected && expected > 0;
                  const isUnder = dayTotal < expected && dayTotal > 0;
                  return (
                    <td key={i} className="px-2 py-3 text-center text-xs tabular-nums">
                      <span className={isOver ? 'text-accent font-bold' : isUnder ? 'text-muted-foreground' : ''}>
                        {dayTotal > 0 ? `${dayTotal}h` : '—'}
                      </span>
                      <div className="text-[10px] text-muted-foreground">{expected}h</div>
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center text-sm tabular-nums">
                  <span className={weekTotal > expectedTotal ? 'text-accent font-bold' : ''}>
                    {weekTotal}h
                  </span>
                  <div className="text-[10px] text-muted-foreground">{expectedTotal}h</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-muted-foreground">
        <span>Horas padrão: Seg 8,75h · Ter–Sex 8,5h · Fim de semana 0h</span>
        <span className="text-accent">● Hora extra</span>
      </div>
    </div>
  );
};

export default RegistroHoras;
