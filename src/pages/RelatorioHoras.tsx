import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSaturday,
  isSunday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Visualizacao = 'semanal' | 'mensal';

const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const RelatorioHoras = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUsuario, setFilterUsuario] = useState('all');
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('semanal');
  const [refDate, setRefDate] = useState(new Date());

  const periodStart = useMemo(() =>
    visualizacao === 'semanal'
      ? startOfWeek(refDate, { weekStartsOn: 1 })
      : startOfMonth(refDate),
    [refDate, visualizacao]
  );

  const periodEnd = useMemo(() =>
    visualizacao === 'semanal'
      ? endOfWeek(refDate, { weekStartsOn: 1 })
      : endOfMonth(refDate),
    [refDate, visualizacao]
  );

  const days = useMemo(() => eachDayOfInterval({ start: periodStart, end: periodEnd }), [periodStart, periodEnd]);

  useEffect(() => {
    supabase.from('esquadro_profiles').select('id, nome, email').eq('ativo', true).order('nome')
      .then(({ data }) => setUsuarios(data || []));
  }, []);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const dateFrom = format(periodStart, 'yyyy-MM-dd');
    const dateTo = format(periodEnd, 'yyyy-MM-dd');

    let query = supabase
      .from('esquadro_registro_horas')
      .select('user_id, data, horas, demanda_id, motivo_nao_trabalho_id')
      .gte('data', dateFrom)
      .lte('data', dateTo);

    if (filterUsuario !== 'all') {
      query = query.eq('user_id', filterUsuario);
    }

    const { data } = await query;
    setRegistros(data || []);
    setLoading(false);
  }, [periodStart, periodEnd, filterUsuario]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const navigate = (dir: number) => {
    setRefDate(prev =>
      visualizacao === 'semanal'
        ? (dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1))
        : (dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1))
    );
  };

  // Group by user
  const usersToShow = useMemo(() => {
    const userIds = filterUsuario !== 'all'
      ? [filterUsuario]
      : [...new Set(registros.map(r => r.user_id))];
    return userIds.map(id => {
      const usr = usuarios.find(u => u.id === id);
      return { id, nome: usr?.nome || usr?.email || id };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [registros, filterUsuario, usuarios]);

  const getUserDayTotal = (userId: string, dateStr: string) =>
    registros
      .filter(r => r.user_id === userId && r.data === dateStr)
      .reduce((sum, r) => sum + (r.horas || 0), 0);

  const getUserTotal = (userId: string) =>
    registros
      .filter(r => r.user_id === userId)
      .reduce((sum, r) => sum + (r.horas || 0), 0);

  const getDayTotal = (dateStr: string) =>
    registros
      .filter(r => r.data === dateStr)
      .reduce((sum, r) => sum + (r.horas || 0), 0);

  const grandTotal = registros.reduce((sum, r) => sum + (r.horas || 0), 0);

  const periodLabel = visualizacao === 'semanal'
    ? `${format(periodStart, "dd 'de' MMMM", { locale: ptBR })} — ${format(periodEnd, "dd 'de' MMMM yyyy", { locale: ptBR })}`
    : format(periodStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Horas</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualização de horas trabalhadas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={visualizacao} onValueChange={(v) => setVisualizacao(v as Visualizacao)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterUsuario} onValueChange={setFilterUsuario}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {usuarios.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[260px] text-center capitalize">
          {periodLabel}
        </span>
        <Button variant="outline" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[180px] sticky left-0 bg-muted z-10">
                Usuário
              </th>
              {days.map((day, i) => {
                const isWeekend = isSaturday(day) || isSunday(day);
                return (
                  <th key={i} className={`text-center px-1 py-3 font-medium min-w-[52px] ${isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                    <div className="text-[10px]">{visualizacao === 'semanal' ? DAY_NAMES_SHORT[i] : format(day, 'EEE', { locale: ptBR })}</div>
                    <div className="text-[10px] font-normal">{format(day, 'dd')}</div>
                  </th>
                );
              })}
              <th className="text-center px-3 py-3 font-medium text-muted-foreground min-w-[60px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : usersToShow.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              <>
                {usersToShow.map(usr => {
                  const total = getUserTotal(usr.id);
                  return (
                    <tr key={usr.id} className="border-t">
                      <td className="px-4 py-2 font-medium text-xs sticky left-0 bg-card z-10 truncate max-w-[180px]">
                        {usr.nome}
                      </td>
                      {days.map((day, i) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const val = getUserDayTotal(usr.id, dateStr);
                        const isWeekend = isSaturday(day) || isSunday(day);
                        return (
                          <td key={i} className={`px-1 py-2 text-center text-xs tabular-nums ${isWeekend ? 'bg-muted/30' : ''}`}>
                            {val > 0 ? `${val}` : <span className="text-muted-foreground/30">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-medium text-xs tabular-nums">
                        {total > 0 ? `${total}h` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                {usersToShow.length > 1 && (
                  <tr className="border-t-2 border-primary/20 bg-muted/50 font-medium">
                    <td className="px-4 py-3 sticky left-0 bg-muted/50 z-10 text-xs">Total</td>
                    {days.map((day, i) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const val = getDayTotal(dateStr);
                      return (
                        <td key={i} className="px-1 py-3 text-center text-xs tabular-nums">
                          {val > 0 ? `${val}` : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-sm tabular-nums font-bold">
                      {grandTotal}h
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RelatorioHoras;
