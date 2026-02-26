import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Comentarios = () => {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState('all');
  const [filterDemanda, setFilterDemanda] = useState('all');
  const [novoTexto, setNovoTexto] = useState('');
  const [novoDemandaId, setNovoDemandaId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchRefData = async () => {
      const [empRes, demRes] = await Promise.all([
        supabase.from('esquadro_empreendimentos').select('*').eq('ativo', true).order('nome'),
        supabase.from('esquadro_demandas').select(`
          id,
          empreendimento_id,
          empreendimento:esquadro_empreendimentos(nome),
          tipo_projeto:esquadro_tipos_projeto(nome)
        `).order('created_at', { ascending: false }),
      ]);
      setEmpreendimentos(empRes.data || []);
      setDemandas(demRes.data || []);
    };
    fetchRefData();
  }, []);

  const fetchComentarios = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('esquadro_comentarios')
      .select(`
        *,
        demanda:esquadro_demandas(
          id,
          empreendimento_id,
          empreendimento:esquadro_empreendimentos(nome),
          tipo_projeto:esquadro_tipos_projeto(nome)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterDemanda !== 'all') {
      query = query.eq('demanda_id', filterDemanda);
    }

    const { data, error } = await query;
    if (!error) {
      let result = data || [];
      if (filterEmp !== 'all') {
        result = result.filter((c: any) => c.demanda?.empreendimento_id === filterEmp);
      }
      setComentarios(result);
    }
    setLoading(false);
  }, [filterEmp, filterDemanda]);

  useEffect(() => {
    fetchComentarios();
  }, [fetchComentarios]);

  const filteredDemandas = filterEmp === 'all'
    ? demandas
    : demandas.filter((d: any) => d.empreendimento_id === filterEmp);

  const handleSend = async () => {
    if (!novoTexto.trim() || !novoDemandaId) {
      toast({ title: 'Selecione uma demanda e escreva o comentário', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('esquadro_comentarios').insert({
      demanda_id: novoDemandaId,
      user_id: user?.id,
      texto: novoTexto.trim(),
    });
    if (error) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Comentário enviado' });
      setNovoTexto('');
      fetchComentarios();
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Comentários</h1>
        <p className="text-muted-foreground text-sm mt-1">Comunicação por demanda</p>
      </div>

      {/* New comment */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <Select value={novoDemandaId} onValueChange={setNovoDemandaId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione a demanda" />
            </SelectTrigger>
            <SelectContent>
              {demandas.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.empreendimento?.nome} — {d.tipo_projeto?.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Textarea
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            placeholder="Escreva seu comentário..."
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sending} size="icon" className="self-end h-10 w-10">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterEmp} onValueChange={(v) => { setFilterEmp(v); setFilterDemanda('all'); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Empreendimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os empreendimentos</SelectItem>
            {empreendimentos.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDemanda} onValueChange={setFilterDemanda}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Demanda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as demandas</SelectItem>
            {filteredDemandas.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.empreendimento?.nome} — {d.tipo_projeto?.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>}
        {!loading && comentarios.length === 0 && (
          <div className="bg-card border rounded-lg p-12 flex flex-col items-center text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum comentário encontrado.</p>
          </div>
        )}
        {comentarios.map((c: any) => (
          <div key={c.id} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {c.user_id?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {c.demanda?.empreendimento?.nome} — {c.demanda?.tipo_projeto?.nome}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comentarios;
