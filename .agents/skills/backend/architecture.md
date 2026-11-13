# Madero — Padrões de Desenvolvimento .NET

Guia de referência para gerar código consistente com a arquitetura e convenções
dos projetos backend **.NET do Grupo Madero**.

---

## Quando usar esta skill

- Criando uma nova feature (controller → service → repository)
- Revisando código de qualquer camada
- Adicionando um novo UnitOfWork ou repositório
- Criando Models ou Mappers
- Registrando serviços no DI container

---

## Estrutura de Camadas

```
<Projeto>.Api            → Controllers (magros, sem lógica de negócio)
<Projeto>.Application    → Interfaces, Services, Models, Mappers, Validations, IoC
<Projeto>.Domain         → Entities, Repositories (interfaces), UnitOfWorks (interfaces), Http (interfaces + Options + Models), Enums
<Projeto>.Infrastructure → Repositories (impl), UnitOfWorks (impl), Http (impl + Handlers), IoC
```

**Regra de dependência:** Api → Application → Domain ← Infrastructure

Contratos de APIs externas, inclusive tipos auxiliares de serialização/desserialização,
ficam em `Domain/Http/<Sistema>/Models/`. Não declarar esses tipos na Infrastructure,
nem aninhados dentro de serviços. Consulte [external-integrations.md](external-integrations.md).

---

## Checklist para nova feature

```
[ ] Database/                    → Script DDL da tabela (Id, Uuid, colunas, CreatedAt, UpdatedAt, Deleted) — ver database.md
[ ] Domain/Entities/             → XEntity.cs  (Guid para Uuid, DateTimeOffset para CreatedAt/UpdatedAt)
[ ] Domain/Repositories/         → IXRepository.cs  (interface)
[ ] Domain/UnitOfWorks/          → Adicionar IXRepository ao IUnitOfWork correspondente
[ ] Infrastructure/Repositories/ → XRepository.cs  (impl Dapper, filtrar Deleted = 0 nos SELECTs)
[ ] Infrastructure/UnitOfWorks/  → Adicionar XRepository à implementação do UnitOfWork
[ ] Application/Models/          → XModel.cs  (nunca XDto)
[ ] Application/Mappers/         → XModelMap.cs  (métodos estáticos ToModel / ToEntity)
[ ] Application/Interfaces/X/    → IXService.cs
[ ] Application/Services/X/      → XService.cs  (injeta IUnitOfWork + ILogger, retorna Result<T>)
[ ] Application/IoC.cs           → services.AddTransient<IXService, XService>()
[ ] Api/Controllers/             → XController.cs  ([FromServices] IXService)
```

---

## Anti-padrões — O que NÃO fazer

| ❌ Errado | ✅ Correto |
|---|---|
| Usar "DTO" no nome das classes | Usar `Model` como sufixo |
| Injetar repositório direto no serviço | Injetar `IUnitOfWork` e acessar via propriedade |
| `AddScoped` ou `AddSingleton` em serviços | `AddTransient` para todos os serviços |
| Lançar exceções para controle de fluxo | Retornar `Result<T>` |
| Lógica de negócio no Controller | Controller apenas orquestra chamada ao serviço |
| SQL em serviço de Application | SQL apenas em repositórios (Infrastructure) |
| Instanciar repositório com `new` no serviço | Acessar pelo UnitOfWork (`_unitOfWork.Product.GetByIdAsync(...)`) |
| AutoMapper | Mappers manuais estáticos em `Application/Mappers/` |
| `LogExtensions.LogErr(...)` estático | Injetar `ILogger<TService>` e usar `_logger.LogError(ex, "msg", args)` |
