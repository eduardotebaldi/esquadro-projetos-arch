import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConfigCrudTable from '@/components/config/ConfigCrudTable';
import ConfigUsuarios from '@/components/config/ConfigUsuarios';

const statusColumns = [
  { key: 'nome', label: 'Nome', type: 'text' as const },
  { key: 'descricao', label: 'Descrição', type: 'textarea' as const },
  { key: 'ordem', label: 'Ordem', type: 'number' as const },
];

const simpleColumns = [
  { key: 'nome', label: 'Nome', type: 'text' as const },
];

const Configuracoes = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Administração do sistema</p>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Projeto</TabsTrigger>
          <TabsTrigger value="empreendimentos">Empreendimentos</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <ConfigCrudTable
            tableName="esquadro_status"
            title="Status"
            columns={statusColumns}
            orderBy="ordem"
          />
        </TabsContent>

        <TabsContent value="tipos">
          <ConfigCrudTable
            tableName="esquadro_tipos_projeto"
            title="Tipos de Projeto"
            columns={simpleColumns}
          />
        </TabsContent>

        <TabsContent value="empreendimentos">
          <ConfigCrudTable
            tableName="esquadro_empreendimentos"
            title="Empreendimentos"
            columns={simpleColumns}
          />
        </TabsContent>

        <TabsContent value="motivos">
          <ConfigCrudTable
            tableName="esquadro_motivos_nao_trabalho"
            title="Motivos de Não-Trabalho"
            columns={simpleColumns}
          />
        </TabsContent>

        <TabsContent value="usuarios">
          <ConfigUsuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
