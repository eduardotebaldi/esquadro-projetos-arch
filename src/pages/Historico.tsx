import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['hsl(226, 100%, 22%)', 'hsl(20, 100%, 50%)', 'hsl(0, 0%, 45%)', 'hsl(226, 60%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(226, 100%, 28%)'];

const Historico = () => {
  const [custosPorProjeto, setCustosPorProjeto] = useState<any[]>([]);
  const [mediaHorasPorTipo, setMediaHorasPorTipo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [demRes, horasRes, usrRes] = await Promise.all([
        supabase.from('esquadro_demandas').select(`
          id, horas_estimadas,
          empreendimento:esquadro_empreendimentos(id, nome),
          tipo_projeto:esquadro_tipos_projeto(id, nome)
        `),
        supabase.from('esquadro_registro_horas').select('demanda_id, user_id, horas'),
        supabase.from('esquadro_profiles').select('id, custo_hora'),
      ]);

      const demandas = demRes.data || [];
      const horas = horasRes.data || [];
      const usuarios = usrRes.data || [];

      // --- Custos por empreendimento ---
      const empMap: Record<string, { nome: string; custo: number; horas: number }> = {};
      demandas.forEach((d: any) => {
        const empId = d.empreendimento?.id;
        const empNome = d.empreendimento?.nome;
        if (!empId) return;
        if (!empMap[empId]) empMap[empId] = { nome: empNome, custo: 0, horas: 0 };

        const demHoras = horas.filter((h: any) => h.demanda_id === d.id);
        demHoras.forEach((h: any) => {
          const usr = usuarios.find((u: any) => u.id === h.user_id);
          const custoHora = usr?.custo_hora || 0;
          empMap[empId].custo += (h.horas || 0) * custoHora;
          empMap[empId].horas += h.horas || 0;
        });
      });

      setCustosPorProjeto(
        Object.values(empMap)
          .filter((e) => e.horas > 0)
          .sort((a, b) => b.custo - a.custo)
      );

      // --- Média de horas por tipo de projeto ---
      const tipoMap: Record<string, { nome: string; totalHoras: number; count: number }> = {};
      demandas.forEach((d: any) => {
        const tipoId = d.tipo_projeto?.id;
        const tipoNome = d.tipo_projeto?.nome;
        if (!tipoId) return;
        if (!tipoMap[tipoId]) tipoMap[tipoId] = { nome: tipoNome, totalHoras: 0, count: 0 };

        const demHoras = horas
          .filter((h: any) => h.demanda_id === d.id)
          .reduce((s: number, h: any) => s + (h.horas || 0), 0);

        if (demHoras > 0) {
          tipoMap[tipoId].totalHoras += demHoras;
          tipoMap[tipoId].count += 1;
        }
      });

      setMediaHorasPorTipo(
        Object.values(tipoMap)
          .filter((t) => t.count > 0)
          .map((t) => ({ nome: t.nome, media: Math.round((t.totalHoras / t.count) * 10) / 10, total: t.totalHoras }))
          .sort((a, b) => b.media - a.media)
      );

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm mt-1">Relatórios e comparativos</p>
        </div>
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      </div>
    );
  }

  const hasData = custosPorProjeto.length > 0 || mediaHorasPorTipo.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-muted-foreground text-sm mt-1">Relatórios e comparativos</p>
      </div>

      {!hasData ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Sem dados suficientes para gerar relatórios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custos por empreendimento */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Custos por Empreendimento</h2>
            {custosPorProjeto.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={custosPorProjeto} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={120}
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="custo" fill="hsl(226, 100%, 22%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Média de horas por tipo de projeto */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Média de Horas por Tipo de Projeto</h2>
            {mediaHorasPorTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mediaHorasPorTipo} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value}h`,
                      name === 'media' ? 'Média' : 'Total',
                    ]}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="media" name="Média" fill="hsl(20, 100%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Distribuição de custos (Pie) */}
          {custosPorProjeto.length > 0 && (
            <div className="bg-card border rounded-lg p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Distribuição de Custos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={custosPorProjeto}
                    dataKey="custo"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  >
                    {custosPorProjeto.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Historico;
