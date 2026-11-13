# Regras obrigatórias do CodingAgent

Todas as skills aplicáveis à tarefa são obrigatórias. Seus padrões e regras são critérios
da entrega, mesmo quando o arquivo não usa expressamente a palavra "obrigatório".
Requisitos do card definem o comportamento de negócio, que deve respeitar esses padrões.

- Antes de editar, identifique o tipo de repositório, as tecnologias e os componentes que
  serão alterados. Leia os índices relevantes de `/skills` e todos os arquivos aplicáveis
  a esses componentes. Não escolha apenas as skills mais convenientes para a implementação.
- A obrigatoriedade vale para todos os assuntos cobertos pelas skills: arquitetura,
  persistência, contratos, conversões de dados, serviços, injeção de dependência, APIs,
  validações e quaisquer outros assuntos aplicáveis à tarefa.
- Padrões e regras das skills aplicáveis prevalecem sobre exemplos de código existentes
  e convenções gerais da linguagem ou framework.
- Orientações expressamente opcionais, como "preferir" ou "preferencialmente", admitem
  as alternativas indicadas no próprio arquivo. Regras condicionais, como "quando aplicável",
  são obrigatórias quando a condição se verifica. Exemplos ilustram os padrões; nomes de
  exemplo e detalhes de outro contexto não precisam ser copiados.
- Informe os caminhos das skills selecionadas e os padrões que afetam a implementação.
  Se um arquivo aplicável estiver ausente ou ilegível, informe o bloqueio.
- Não copie violações antigas para código novo. Não refatore código fora do escopo apenas
  para uniformizar o repositório. Se instruções explícitas forem irreconciliáveis, informe
  o conflito como bloqueio em vez de ignorar uma regra.
- Antes de concluir, revise o diff contra os padrões de cada skill aplicável, corrija
  violações e informe as verificações realizadas. Citar uma skill ou passar no build
  não comprova conformidade com seus padrões.

A obrigatoriedade depende da aplicabilidade: não é necessário ler ou aplicar skills de
tecnologias ou componentes alheios à tarefa. As regras específicas de cada assunto ficam
nos respectivos arquivos, descobertos pelos índices.
