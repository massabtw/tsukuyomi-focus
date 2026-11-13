# Backend Skills

Padrões de desenvolvimento backend C#/.NET dos projetos do Grupo Madero. Leia este índice e abra os arquivos relevantes para a tarefa.

Leia também [mandatory-rules.md](../mandatory-rules.md). Todas as skills aplicáveis são
obrigatórias: seus padrões são critérios da entrega e prevalecem sobre exemplos existentes
no repositório. Respeite as condições e alternativas expressamente opcionais em cada arquivo.
Selecione todos os assuntos envolvidos nos componentes alterados, não apenas o assunto
principal do card. Não copie violações antigas para código novo.

## [architecture.md](architecture.md)
Use como base ao implementar ou revisar código de qualquer camada. Cobre camadas e dependências, checklist de implementação e antipadrões gerais.

## [database.md](database.md)
Use ao criar ou alterar tabelas no SQL Server. Cobre colunas obrigatórias (`Id`, `Uuid`, `CreatedAt`, `UpdatedAt`, `Deleted`), template DDL, soft delete, correspondência Entity ↔ Tabela e anti-padrões.

## [external-integrations.md](external-integrations.md)
Use ao criar ou alterar integrações HTTP, inclusive chamadas a Google Maps ou qualquer API de terceiros. Cobre interface, Options e todos os contratos JSON no Domain (inclusive envelopes e tipos privados de desserialização), implementação com HttpClient na Infrastructure, autenticação e registro no DI.

## [internal-packages.md](internal-packages.md)
Use quando a tarefa usa, configura ou altera pacotes NuGet `GrupoMadero.*`, trata diagnósticos de analyzers internos (`SDK00x`) ou depende do código de outro sistema interno. Cobre a consulta somente leitura ao Azure DevOps pelo MCP: wiki `Nuget.wiki`, repositórios do projeto `Nuget`, versão do pacote e código de outros repositórios.

## [unit-of-work.md](unit-of-work.md)
Use ao criar ou alterar UnitOfWork, conexões, transações e exposição de repositórios. O registro no DI está em `dependency-injection.md`.

## [dapper.md](dapper.md)
Use para interfaces e implementações de repositórios, consultas SQL, parâmetros, transações e métodos Dapper.

## [models.md](models.md)
Use para Models da Application e Entities do Domain, incluindo nomes, propriedades e mapeamento de colunas.

## [mappers.md](mappers.md)
Use para realizar conversões Entity -> Model ou Model -> Entity, coleções, objetos relacionados, nullability e limites de responsabilidade dos mappers.

## [services.md](services.md)
Use para interfaces e implementações de serviços, `Result<T>`, logging, UnitOfWork e chamada de mappers.

## [dependency-injection.md](dependency-injection.md)
Use para registrar serviços, UnitOfWork, factories, HttpClient com handler e definir lifetimes no IoC.

## [restful.md](restful.md)
Use para controllers, rotas REST, injeção por `[FromServices]` e respostas HTTP via `Result<T>`.

## [validations.md](validations.md)
Use para validadores FluentValidation e registro automático de validators na Application.
