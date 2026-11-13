---
name: madero-backend
description: Padrões obrigatórios C#/.NET dos backends do Grupo Madero com camadas Api, Application, Domain e Infrastructure. Use ao implementar ou revisar código desses backends.
---

# Backend Madero

Leia [as regras obrigatórias](/skills/mandatory-rules.md) e [o índice](index.md).
Leia [architecture.md](architecture.md) ao implementar ou revisar código dessas camadas.
Use o índice para identificar e ler todos os demais arquivos aplicáveis aos componentes
alterados, antes de editar. Não basta citar seus nomes.

Todas as skills aplicáveis são obrigatórias: seus padrões e regras prevalecem sobre
exemplos existentes e convenções gerais, mesmo sem a palavra "obrigatório" no arquivo.
Respeite as alternativas expressamente opcionais e as condições indicadas em cada skill.
Preserve o código fora do escopo; se instruções explícitas forem irreconciliáveis, informe o bloqueio.

Selecione as skills pelos componentes envolvidos, incluindo persistência, UnitOfWork,
models, mappers, serviços, injeção de dependência, controllers, validações, integrações
e pacotes internos `GrupoMadero.*`.
Uma tarefa que atravessa várias camadas exige todas as skills correspondentes, não apenas
a que descreve o assunto principal do card. Os detalhes de cada padrão ficam nesses arquivos.

Antes de concluir, revise o diff contra os padrões de cada skill aplicável e corrija
violações. Informe quais arquivos foram lidos e como seus padrões foram aplicados.
