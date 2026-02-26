import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building2, ClipboardList, AlertTriangle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    empreendimentos: 0,
    emAndamento: 0,
    atrasadas: 0,
    horasMes: 0,
  });
  const [demandas, setDemandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      const mesInicio = format(startOfMonth(now), 'yyyy-MM-dd');
      const mesFim = format(endOfMonth(now), 'yyyy-MM-dd');

      const [empRes, demRes, horasRes] = await Promise.all([
        supabase.from('esquadro_empreendimentos').select('id', { count: 'exact' }).eq('ativo', true),
        supabase.from('esquadro_demandas').select(`
          *,
          empreendimento:esquadro_empreendimentos(nome),
          status:esquadro_status(nome),
          tipo_projeto:esquadro_tipos_projeto(nome)
        `).order('prioridade').order('prazo'),
        supabase.from('esquadro_registro_horas').select('horas').gte('data', mesInicio).lte('data', mesFim),
      ]);

      const allDemandas = demRes.data || [];
      const atrasadas = allDemandas.filter(
        (d: any) => d.prazo && new Date(d.prazo) < now && d.status?.nome !== 'concluído' && d.status?.nome !== 'cancelado'
      );
      const horasTotal = (horasRes.data || []).reduce((sum: number, r: any) => sum + (r.horas || 0), 0);

      setStats({
        empreendimentos: empRes.count || 0,
        emAndamento: allDemandas.filter((d: any) => d.status?.nome === 'em andamento').length,
        atrasadas: atrasadas.length,
        horasMes: horasTotal,
      });

      // Top 5 mais urgentes (próximas do prazo)
      const urgentes = allDemandas
        .filter((d: any) => d.prazo && d.status?.nome !== 'concluído' && d.status?.nome !== 'cancelado')
        .sort((a: any, b: any) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())
        .slice(0, 5);
      setDemandas(urgentes);

      setLoading(false);
    };
    fetch();
  }, []);

  const statCards = [
    { label: 'Empreendimentos Ativos', value: stats.empreendimentos, icon: Building2, color: 'bg-primary' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: ClipboardList, color: 'bg-accent' },
    { label: 'Atrasadas', value: stats.atrasadas, icon: AlertTriangle, color: 'bg-destructive' },
    { label: 'Horas no Mês', value: `${stats.horasMes}h`, icon: Clock, color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral dos projetos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="bg-card border rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">Demandas Urgentes</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : demandas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma demanda com prazo próximo.</p>
        ) : (
          <div className="space-y-3">
            {demandas.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm">{d.empreendimento?.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.tipo_projeto?.nome} · {d.status?.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {d.prazo ? format(new Date(d.prazo), 'dd/MM/yyyy') : '—'}
                  </p>
                  {d.prazo && new Date(d.prazo) < new Date() && (
                    <p className="text-xs text-destructive font-medium">Atrasada</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
