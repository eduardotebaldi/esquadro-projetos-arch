export interface Status {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface TipoProjeto {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface Empreendimento {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface MotivoNaoTrabalho {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface Demanda {
  id: string;
  empreendimento_id: string;
  tipo_projeto_id: string;
  status_id: string;
  arquiteta_id: string | null;
  data_solicitacao: string;
  prioridade: number;
  prazo: string | null;
  horas_estimadas: number | null;
  instrucoes: string | null;
  created_at: string;
  // Joined fields
  empreendimento?: Empreendimento;
  status?: Status;
  tipo_projeto?: TipoProjeto;
}

export interface Comentario {
  id: string;
  demanda_id: string;
  user_id: string;
  conteudo: string;
  created_at: string;
}

export interface RegistroHora {
  id: string;
  demanda_id: string;
  user_id: string;
  data: string;
  horas: number;
  motivo_nao_trabalho_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  role: 'admin' | 'arquiteta' | 'comum';
  ativo: boolean;
  custo_hora: number | null;
  created_at: string;
}
