import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, ClipboardList, AlertTriangle, Clock, CheckCircle2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, startOfDay, subDays } from 'date-fns';

const HORAS_PADRAO: Record<number, number> = {
  1: 8.75, // segunda
  2: 8.5,  // terça
  3: 8.5,  // quarta
  4: 8.5,  // quinta
  5: 8.5,  // sexta
  6: 0,    // sábado
  0: 0,    // domingo
};

const ALOCACAO_INICIO = new Date('2026-02-23');

const prioridadeLabel: Record<number, string> = { 1: 'Alta', 2: 'Média', 3: 'Baixa' };
const prioridadeColor: Record<number, string> = {
  1: 'bg-destructive text-destructive-foreground',
  2: 'bg-accent text-accent-foreground',
  3: 'bg-muted text-muted-foreground',
};

const Dashboard = () => {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    empreendimentos: 0,
    emAndamento: 0,
    atrasadas: 0,
    horasMes: 0,
    concluidas: 0,
    totalDemandas: 0,
  });
  const [urgentes, setUrgentes] = useState<any[]>([]);
  const [recentes, setRecentes] = useState<any[]>([]);
  const [pendencias, setPendencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const mesInicio = format(startOfMonth(now), 'yyyy-MM-dd');
      const mesFim = format(endOfMonth(now), 'yyyy-MM-dd');

      const [empRes, demRes, horasRes, statusRes] = await Promise.all([
        supabase.from('esquadro_empreendimentos').select('id', { count: 'exact' }).eq('ativo', true),
        supabase.from('esquadro_demandas').select(`
          *,
          empreendimento:esquadro_empreendimentos(nome),
          status:esquadro_status(id, nome),
          tipo_projeto:esquadro_tipos_projeto(nome)
        `).order('prioridade').order('prazo'),
        supabase.from('esquadro_registro_horas').select('horas, user_id')
          .gte('data', mesInicio).lte('data', mesFim),
        supabase.from('esquadro_status').select('id, nome').eq('ativo', true),
      ]);

      const allDemandas = demRes.data || [];
      const allStatus = statusRes.data || [];

      // Find status IDs by normalized name matching
      const findStatusIds = (keywords: string[]) =>
        allStatus
          .filter((s: any) => keywords.some((k) => s.nome.toLowerCase().includes(k)))
          .map((s: any) => s.id);

      const emAndamentoIds = findStatusIds(['andamento']);
      const concluidoIds = findStatusIds(['conclu']);
      const canceladoIds = findStatusIds(['cancel']);
      const finishedIds = [...concluidoIds, ...canceladoIds];

      const emAndamento = allDemandas.filter((d: any) => emAndamentoIds.includes(d.status_id));
      const concluidas = allDemandas.filter((d: any) => concluidoIds.includes(d.status_id));
      const atrasadas = allDemandas.filter(
        (d: any) => d.prazo && new Date(d.prazo) < now && !finishedIds.includes(d.status_id)
      );

      // Hours this month - filter by user if not admin
      const horasData = horasRes.data || [];
      const horasFiltered = isAdmin
        ? horasData
        : horasData.filter((h: any) => h.user_id === profile?.id);
      const horasTotal = horasFiltered.reduce((sum: number, r: any) => sum + (r.horas || 0), 0);

      setStats({
        empreendimentos: empRes.count || 0,
        emAndamento: emAndamento.length,
        atrasadas: atrasadas.length,
        horasMes: horasTotal,
        concluidas: concluidas.length,
        totalDemandas: allDemandas.length,
      });

      // Top urgentes (closest deadline, not finished)
      const urgentesList = allDemandas
        .filter((d: any) => d.prazo && !finishedIds.includes(d.status_id))
        .sort((a: any, b: any) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())
        .slice(0, 5);
      setUrgentes(urgentesList);

      // Most recently created
      const recentesList = [...allDemandas]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentes(recentesList);

      // Pendências de alocação de horas (arquitetas)
      const ontem = startOfDay(subDays(new Date(), 1));
      const inicioAlocacao = startOfDay(ALOCACAO_INICIO);
      if (!isBefore(ontem, inicioAlocacao)) {
        // Fetch all arquitetas
        const { data: arquitetas } = await supabase
          .from('esquadro_profiles')
          .select('id, nome, email, role')
          .eq('ativo', true)
          .eq('role', 'arquiteta');

        // Fetch all hour registrations from start date
        const { data: allHoras } = await supabase
          .from('esquadro_registro_horas')
          .select('user_id, data, horas')
          .gte('data', format(inicioAlocacao, 'yyyy-MM-dd'))
          .lte('data', format(ontem, 'yyyy-MM-dd'));

        const horasMap: Record<string, Record<string, number>> = {};
        (allHoras || []).forEach((r: any) => {
          if (!horasMap[r.user_id]) horasMap[r.user_id] = {};
          horasMap[r.user_id][r.data] = (horasMap[r.user_id][r.data] || 0) + (r.horas || 0);
        });

        const diasCheck = eachDayOfInterval({ start: inicioAlocacao, end: ontem });
        const pendList: any[] = [];

        (arquitetas || []).forEach((arq: any) => {
          const userHoras = horasMap[arq.id] || {};
          const gaps: { data: string; esperado: number; alocado: number }[] = [];

          diasCheck.forEach((dia) => {
            const esperado = HORAS_PADRAO[getDay(dia)] || 0;
            if (esperado === 0) return; // skip weekends
            const dateStr = format(dia, 'yyyy-MM-dd');
            const alocado = userHoras[dateStr] || 0;
            if (alocado < esperado) {
              gaps.push({ data: dateStr, esperado, alocado });
            }
          });

          if (gaps.length > 0) {
            const totalFaltante = gaps.reduce((s, g) => s + (g.esperado - g.alocado), 0);
            pendList.push({
              id: arq.id,
              nome: arq.nome || arq.email,
              diasPendentes: gaps.length,
              horasFaltantes: totalFaltante,
              gaps: gaps.slice(-5), // show last 5 gaps
            });
          }
        });

        setPendencias(pendList.sort((a, b) => b.horasFaltantes - a.horasFaltantes));
      }

      setLoading(false);
    };
    fetchData();
  }, [profile?.id, isAdmin]);

  const statCards = [
    { label: 'Total de Demandas', value: stats.totalDemandas, icon: ClipboardList, color: 'bg-primary' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: Clock, color: 'bg-accent' },
    { label: 'Atrasadas', value: stats.atrasadas, icon: AlertTriangle, color: 'bg-destructive' },
    { label: 'Concluídas', value: stats.concluidas, icon: CheckCircle2, color: 'bg-primary' },
    { label: 'Empreendimentos', value: stats.empreendimentos, icon: Building2, color: 'bg-accent' },
    { label: isAdmin ? 'Horas no Mês (Equipe)' : 'Minhas Horas no Mês', value: `${stats.horasMes.toFixed(1)}h`, icon: Users, color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin ? 'Visão geral dos projetos' : `Olá, ${profile?.nome || 'Bem-vindo(a)'}!`}
        </p>
      </div>

      {/* Pendências de alocação de horas */}
      {pendencias.length > 0 && (
        <Link to="/pendencias-horas" className="block">
          <div className="bg-card border border-destructive/20 rounded-lg p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-semibold">Pendências de Alocação de Horas</h2>
              </div>
              <Badge variant="destructive">{pendencias.length} {pendencias.length === 1 ? 'profissional' : 'profissionais'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {pendencias.reduce((s: number, p: any) => s + p.horasFaltantes, 0).toFixed(1)}h faltantes no total. Clique para ver detalhes.
            </p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card border rounded-lg p-5 flex items-start gap-4">
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demandas Urgentes */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Demandas com Prazo Próximo</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : urgentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma demanda com prazo definido.</p>
          ) : (
            <div className="space-y-3">
              {urgentes.map((d: any) => {
                const isLate = d.prazo && new Date(d.prazo) < new Date();
                return (
                  <div key={d.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{d.empreendimento?.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.tipo_projeto?.nome} · {d.status?.nome}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3 flex items-center gap-2">
                      <Badge className={`text-[10px] ${prioridadeColor[d.prioridade] || ''}`}>
                        {prioridadeLabel[d.prioridade] || '—'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(d.prazo), 'dd/MM/yyyy')}
                        </p>
                        {isLate && (
                          <p className="text-xs text-destructive font-medium">Atrasada</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimas demandas criadas */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Demandas Recentes</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma demanda registrada.</p>
          ) : (
            <div className="space-y-3">
              {recentes.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{d.empreendimento?.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.tipo_projeto?.nome} · {d.status?.nome}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <Badge className={`text-[10px] ${prioridadeColor[d.prioridade] || ''}`}>
                      {prioridadeLabel[d.prioridade] || '—'}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(d.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
