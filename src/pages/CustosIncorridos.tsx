import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign } from 'lucide-react';

const CustosIncorridos = () => {
  const [demandas, setDemandas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [horas, setHoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState('all');
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [demRes, usrRes, horasRes, empRes] = await Promise.all([
        supabase.from('esquadro_demandas').select(`
          id, horas_estimadas,
          empreendimento:esquadro_empreendimentos(id, nome),
          tipo_projeto:esquadro_tipos_projeto(nome),
          status:esquadro_status(nome)
        `),
        supabase.from('esquadro_usuarios').select('id, nome, email, custo_hora'),
        supabase.from('esquadro_registro_horas').select('demanda_id, user_id, horas'),
        supabase.from('esquadro_empreendimentos').select('*').eq('ativo', true).order('nome'),
      ]);

      setDemandas(demRes.data || []);
      setUsuarios(usrRes.data || []);
      setHoras(horasRes.data || []);
      setEmpreendimentos(empRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Build cost data per demanda
  const custosPorDemanda = demandas
    .filter((d: any) => filterEmp === 'all' || d.empreendimento?.id === filterEmp)
    .map((d: any) => {
      const horasDemanda = horas.filter((h: any) => h.demanda_id === d.id);
      const totalHoras = horasDemanda.reduce((s: number, h: any) => s + (h.horas || 0), 0);

      // Calculate cost by user
      let custoTotal = 0;
      const porUsuario: Record<string, { horas: number; custo: number; nome: string }> = {};

      horasDemanda.forEach((h: any) => {
        const usr = usuarios.find((u: any) => u.id === h.user_id);
        const custoHora = usr?.custo_hora || 0;
        const custo = (h.horas || 0) * custoHora;
        custoTotal += custo;

        if (!porUsuario[h.user_id]) {
          porUsuario[h.user_id] = { horas: 0, custo: 0, nome: usr?.nome || usr?.email || 'Desconhecido' };
        }
        porUsuario[h.user_id].horas += h.horas || 0;
        porUsuario[h.user_id].custo += custo;
      });

      return {
        ...d,
        totalHoras,
        custoTotal,
        porUsuario,
        progresso: d.horas_estimadas ? Math.min((totalHoras / d.horas_estimadas) * 100, 100) : 0,
      };
    })
    .filter((d: any) => d.totalHoras > 0)
    .sort((a: any, b: any) => b.custoTotal - a.custoTotal);

  const custoGeral = custosPorDemanda.reduce((s, d) => s + d.custoTotal, 0);
  const horasGeral = custosPorDemanda.reduce((s, d) => s + d.totalHoras, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Custos Incorridos</h1>
        <p className="text-muted-foreground text-sm mt-1">Custos realizados por projeto</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Custo Total</p>
            <p className="text-2xl font-bold mt-1">
              {loading ? '—' : `R$ ${custoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Horas</p>
            <p className="text-2xl font-bold mt-1">{loading ? '—' : `${horasGeral}h`}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <Select value={filterEmp} onValueChange={setFilterEmp}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Empreendimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os empreendimentos</SelectItem>
          {empreendimentos.map((e: any) => (
            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cost table */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : custosPorDemanda.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum custo registrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {custosPorDemanda.map((d: any) => (
            <div key={d.id} className="bg-card border rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{d.empreendimento?.nome}</p>
                  <p className="text-sm text-muted-foreground">{d.tipo_projeto?.nome} · {d.status?.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    R$ {d.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.totalHoras}h {d.horas_estimadas ? `/ ${d.horas_estimadas}h estimadas` : ''}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {d.horas_estimadas && (
                <div className="mb-3">
                  <Progress
                    value={d.progresso}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.progresso.toFixed(0)}% das horas estimadas
                  </p>
                </div>
              )}

              {/* Per-user breakdown */}
              <div className="border-t pt-3 space-y-1.5">
                {Object.values(d.porUsuario as Record<string, any>).map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{u.nome}</span>
                    <div className="flex items-center gap-4">
                      <span className="tabular-nums text-muted-foreground">{u.horas}h</span>
                      <span className="tabular-nums font-medium">
                        R$ {u.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustosIncorridos;
