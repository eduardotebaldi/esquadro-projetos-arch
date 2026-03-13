import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Send, Eye, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  role: string;
  ativo: boolean;
}

interface ReportConfig {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  destinatarios: string[]; // array of profile ids
}

const HORAS_PADRAO: Record<number, number> = {
  1: 8.75, 2: 8.5, 3: 8.5, 4: 8.5, 5: 8.5, 6: 0, 0: 0,
};

const DEFAULT_REPORTS: Omit<ReportConfig, 'id'>[] = [
  {
    nome: 'Relatório Semanal de Projetos',
    descricao: 'Enviado toda segunda-feira às 08:00. Inclui lista de projetos em andamento com prazo, prioridade, data de início e horas gastas, além do relatório completo de horas da semana anterior.',
    ativo: true,
    destinatarios: [],
  },
];

const ConfigRelatorios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usuariosRes, reportsRes] = await Promise.all([
        supabase
          .from('esquadro_profiles')
          .select('id, email, nome, role, ativo')
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('esquadro_relatorios_config')
          .select('*')
          .order('created_at'),
      ]);

      setUsuarios(usuariosRes.data || []);

      if (reportsRes.error) {
        // Table might not exist yet — use defaults in memory
        console.warn('Tabela esquadro_relatorios_config não encontrada, usando padrões:', reportsRes.error.message);
        setReports(DEFAULT_REPORTS.map((r, i) => ({ ...r, id: `default-${i}` })));
      } else if ((reportsRes.data || []).length === 0) {
        // Table exists but empty — seed defaults
        const inserts = DEFAULT_REPORTS.map((r) => ({
          nome: r.nome,
          descricao: r.descricao,
          ativo: r.ativo,
          destinatarios: r.destinatarios,
        }));
        const { data: inserted, error: insertError } = await supabase
          .from('esquadro_relatorios_config')
          .insert(inserts)
          .select('*');
        if (insertError) {
          console.error('Erro ao criar relatórios padrão:', insertError.message);
          setReports(DEFAULT_REPORTS.map((r, i) => ({ ...r, id: `default-${i}` })));
        } else {
          setReports((inserted || []).map((r: any) => ({
            id: r.id,
            nome: r.nome,
            descricao: r.descricao,
            ativo: r.ativo,
            destinatarios: r.destinatarios || [],
          })));
        }
      } else {
        setReports((reportsRes.data || []).map((r: any) => ({
          id: r.id,
          nome: r.nome,
          descricao: r.descricao,
          ativo: r.ativo,
          destinatarios: r.destinatarios || [],
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateReport = async (reportId: string, updates: Partial<ReportConfig>) => {
    setSaving(true);
    // Update local state immediately
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, ...updates } : r))
    );

    if (!reportId.startsWith('default-')) {
      const { error } = await supabase
        .from('esquadro_relatorios_config')
        .update(updates)
        .eq('id', reportId);
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        fetchData(); // revert
      }
    }
    setSaving(false);
  };

  const toggleDestinatario = (reportId: string, userId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    const newDest = report.destinatarios.includes(userId)
      ? report.destinatarios.filter((id) => id !== userId)
      : [...report.destinatarios, userId];
    updateReport(reportId, { destinatarios: newDest });
  };

  const generatePreview = async () => {
    setGeneratingPreview(true);
    try {
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
      const dateFrom = format(lastWeekStart, 'yyyy-MM-dd');
      const dateTo = format(lastWeekEnd, 'yyyy-MM-dd');

      // Fetch projects in progress
      const emAndamentoId = '819a3d87-3884-4223-ac1b-7262434f0828';
      const [demandasRes, horasRes, allUsuariosRes] = await Promise.all([
        supabase
          .from('esquadro_demandas')
          .select(`
            id, prioridade, prazo, created_at,
            empreendimento:esquadro_empreendimentos(nome),
            tipo_projeto:esquadro_tipos_projeto(nome),
            status:esquadro_status(nome)
          `)
          .eq('status_id', emAndamentoId)
          .order('prioridade'),
        supabase
          .from('esquadro_registro_horas')
          .select('user_id, demanda_id, data, horas')
          .gte('data', dateFrom)
          .lte('data', dateTo),
        supabase
          .from('esquadro_profiles')
          .select('id, nome, email')
          .eq('ativo', true),
      ]);

      // Calculate total hours per demanda (all time)
      const horasTotalRes = await supabase
        .from('esquadro_registro_horas')
        .select('demanda_id, horas')
        .not('demanda_id', 'is', null);

      const horasPorDemanda: Record<string, number> = {};
      (horasTotalRes.data || []).forEach((r: any) => {
        if (r.demanda_id) {
          horasPorDemanda[r.demanda_id] = (horasPorDemanda[r.demanda_id] || 0) + (r.horas || 0);
        }
      });

      // Weekly hours per user
      const horasPorUsuario: Record<string, Record<string, number>> = {};
      (horasRes.data || []).forEach((r: any) => {
        if (!horasPorUsuario[r.user_id]) horasPorUsuario[r.user_id] = {};
        horasPorUsuario[r.user_id][r.data] = (horasPorUsuario[r.user_id][r.data] || 0) + (r.horas || 0);
      });

      setPreviewData({
        periodo: `${format(lastWeekStart, "dd/MM/yyyy")} a ${format(lastWeekEnd, "dd/MM/yyyy")}`,
        demandas: (demandasRes.data || []).map((d: any) => ({
          empreendimento: d.empreendimento?.nome || '—',
          tipoProjeto: d.tipo_projeto?.nome || '—',
          status: d.status?.nome || '—',
          prioridade: d.prioridade || '—',
          prazo: d.prazo ? format(new Date(d.prazo + 'T12:00:00'), 'dd/MM/yyyy') : '—',
          inicio: d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy') : '—',
          horasGastas: horasPorDemanda[d.id] ? horasPorDemanda[d.id].toFixed(1) : '0',
        })),
        horasUsuarios: (allUsuariosRes.data || []).map((u: any) => {
          const userHoras = horasPorUsuario[u.id] || {};
          const days: { data: string; horas: number }[] = [];
          let total = 0;
          for (let i = 0; i < 7; i++) {
            const d = new Date(lastWeekStart);
            d.setDate(d.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const h = userHoras[dateStr] || 0;
            days.push({ data: dateStr, horas: h });
            total += h;
          }
          return { nome: u.nome || u.email, days, total };
        }).filter((u: any) => u.total > 0),
        lastWeekStart,
      });
      setPreviewOpen(true);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      toast({ title: 'Erro ao gerar relatório', variant: 'destructive' });
    } finally {
      setGeneratingPreview(false);
    }
  };

  const getDisplayName = (u: Usuario) => {
    if (u.nome) {
      const parts = u.nome.split(' ');
      if (parts.length >= 2) return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
      return u.nome;
    }
    return u.email;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">Relatórios</h3>
          <p className="text-sm text-muted-foreground">Configure os relatórios automáticos do sistema</p>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {reports.map((report) => (
          <AccordionItem
            key={report.id}
            value={report.id}
            className="border rounded-lg px-4 bg-card"
          >
            <div className="flex items-center justify-between py-3">
              <AccordionTrigger className="hover:no-underline p-0 flex-1 [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3 text-left">
                  <span className="font-semibold text-sm">{report.nome}</span>
                  <Badge
                    variant={report.ativo ? 'default' : 'secondary'}
                    className={report.ativo
                      ? 'bg-accent text-accent-foreground text-[10px] px-2 py-0'
                      : 'text-[10px] px-2 py-0'
                    }
                  >
                    {report.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <Switch
                checked={report.ativo}
                onCheckedChange={(checked) => updateReport(report.id, { ativo: checked })}
                className="ml-4"
              />
            </div>

            <AccordionContent className="pb-4">
              <p className="text-sm text-muted-foreground mb-4">{report.descricao}</p>

              <div className="space-y-3">
                <p className="text-sm font-medium">Destinatários</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {usuarios.map((u) => {
                    const isSelected = report.destinatarios.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDestinatario(report.id, u.id)}
                          className={isSelected ? 'border-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent' : ''}
                        />
                        <span className={isSelected ? 'font-medium' : 'text-muted-foreground'}>
                          {getDisplayName(u)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={generatePreview}
                  disabled={generatingPreview}
                >
                  <Send className="w-3.5 h-3.5" />
                  {generatingPreview ? 'Gerando...' : 'Gerar Agora'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    generatePreview();
                  }}
                  disabled={generatingPreview}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar Relatório
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório Semanal de Projetos</DialogTitle>
            {previewData && (
              <p className="text-sm text-muted-foreground">
                Período: {previewData.periodo}
              </p>
            )}
          </DialogHeader>

          {previewData && (
            <div className="space-y-6 mt-2">
              {/* Projects in progress */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Projetos em Andamento
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Empreendimento</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Prioridade</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Início</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Prazo</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Horas Gastas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.demandas.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                            Nenhum projeto em andamento.
                          </td>
                        </tr>
                      )}
                      {previewData.demandas.map((d: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{d.empreendimento}</td>
                          <td className="px-3 py-2 text-muted-foreground">{d.tipoProjeto}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              P{d.prioridade}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">{d.inicio}</td>
                          <td className="px-3 py-2 text-center tabular-nums">{d.prazo}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{d.horasGastas}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weekly hours report */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Horas da Semana Anterior
                </h3>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[140px]">Usuário</th>
                        {previewData.horasUsuarios.length > 0 &&
                          previewData.horasUsuarios[0].days.map((d: any, i: number) => (
                            <th key={i} className="text-center px-2 py-2 font-medium text-muted-foreground min-w-[60px]">
                              <div>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}</div>
                              <div className="text-[10px] font-normal">
                                {format(new Date(d.data + 'T12:00:00'), 'dd/MM')}
                              </div>
                            </th>
                          ))
                        }
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground min-w-[60px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.horasUsuarios.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">
                            Nenhum registro de horas na semana.
                          </td>
                        </tr>
                      )}
                      {previewData.horasUsuarios.map((u: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{u.nome}</td>
                          {u.days.map((d: any, j: number) => {
                            const expected = HORAS_PADRAO[getDay(new Date(d.data + 'T12:00:00'))] || 0;
                            const isUnder = d.horas < expected && expected > 0;
                            return (
                              <td
                                key={j}
                                className={`px-2 py-2 text-center tabular-nums ${isUnder ? 'text-destructive' : ''}`}
                              >
                                {d.horas > 0 ? `${d.horas}h` : '—'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center tabular-nums font-semibold">
                            {u.total.toFixed(1)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfigRelatorios;
