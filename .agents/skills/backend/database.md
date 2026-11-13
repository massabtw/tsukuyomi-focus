# Banco de Dados — SQL Server

## Padrão de criação de tabelas

Toda tabela criada nos projetos do Grupo Madero deve seguir este padrão obrigatório.

---

## Colunas obrigatórias

Toda tabela deve ter **exatamente** estas colunas, nesta ordem: primeiro `Id` e `Uuid`, depois as colunas específicas da entidade, e por fim as colunas de auditoria.

| Coluna      | Tipo                   | Descrição                                                              |
|-------------|------------------------|------------------------------------------------------------------------|
| `Id`        | `INT IDENTITY(1,1)`    | Chave primária numérica auto-incremental. Uso **interno** (joins, FK). |
| `Uuid`      | `UNIQUEIDENTIFIER`     | Identificador único externo. Uso na **API** e em integrações.          |
| `CreatedAt` | `DATETIMEOFFSET(7)`    | Data/hora UTC de criação do registro.                                  |
| `UpdatedAt` | `DATETIMEOFFSET(7)`    | Data/hora UTC da última atualização do registro.                       |
| `Deleted`   | `BIT`                  | Soft delete. `0` = ativo, `1` = excluído. **Sempre filtrar no back.**  |

---

## Template DDL

```sql
CREATE TABLE [NomeDaTabela] (
    [Id]                 INT                IDENTITY (1, 1) NOT NULL,
    [Uuid]               UNIQUEIDENTIFIER   DEFAULT (newid()) NOT NULL,
    -- colunas específicas da entidade aqui
    [CreatedAt]          DATETIMEOFFSET (7) DEFAULT (getutcdate()) NULL,
    [UpdatedAt]          DATETIMEOFFSET (7) DEFAULT (getutcdate()) NULL,
    [Deleted]            BIT                DEFAULT ((0)) NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);
```

---

## Exemplo completo

```sql
CREATE TABLE [Product] (
    [Id]                 INT                IDENTITY (1, 1) NOT NULL,
    [Uuid]               UNIQUEIDENTIFIER   DEFAULT (newid()) NOT NULL,
    [Code]               VARCHAR (20)       NOT NULL,
    [Name]               VARCHAR (200)      NOT NULL,
    [Price]              DECIMAL (18, 2)    NOT NULL,
    [CreatedAt]          DATETIMEOFFSET (7) DEFAULT (getutcdate()) NULL,
    [UpdatedAt]          DATETIMEOFFSET (7) DEFAULT (getutcdate()) NULL,
    [Deleted]            BIT                DEFAULT ((0)) NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);
```

---

## Regras obrigatórias

- **`Id`** nunca é exposto diretamente na API. Para referenciar um registro externamente, use sempre `Uuid`.
- **`Uuid`** deve ter `DEFAULT (newid())` para ser gerado automaticamente pelo banco.
- **`CreatedAt`** e **`UpdatedAt`** devem ter `DEFAULT (getutcdate())` — sempre UTC.
- **`Deleted`** é o mecanismo de **soft delete**: registros excluídos recebem `Deleted = 1` e **nunca são removidos fisicamente**.
- Todo repositório Dapper deve filtrar `AND Deleted = 0` em todos os SELECTs.
- O UPDATE de deleção lógica deve setar `Deleted = 1` e atualizar `UpdatedAt`.

---

## Soft delete no repositório

O `DeleteAsync` nunca executa `DELETE FROM`. Sempre usa `UPDATE ... SET Deleted = 1`:

```csharp
public async Task<bool> DeleteAsync(int id)
{
    const string sql = @"
        UPDATE Product
           SET Deleted   = 1,
               UpdatedAt = @UpdatedAt
         WHERE Id = @id
           AND Deleted = 0";

    var rows = await _unitOfWork.Connection
        .ExecuteAsync(sql,
            new { id, UpdatedAt = DateTimeOffset.UtcNow },
            transaction: _unitOfWork.Transaction);

    return rows > 0;
}
```

---

## Correspondência Entity ↔ Tabela

As propriedades da `Entity` devem refletir as colunas da tabela, respeitando os tipos .NET equivalentes:

| Coluna SQL               | Tipo .NET                  |
|--------------------------|----------------------------|
| `INT`                    | `int`                      |
| `UNIQUEIDENTIFIER`       | `Guid`                     |
| `VARCHAR` / `NVARCHAR`   | `string`                   |
| `DECIMAL`                | `decimal`                  |
| `BIT`                    | `bool` ou `int`            |
| `DATETIMEOFFSET`         | `DateTimeOffset`           |
| `DATETIME` / `DATETIME2` | `DateTime`                 |

Exemplo de Entity alinhada ao padrão:

```csharp
// <Projeto>.Domain/Entities/ProductEntity.cs
namespace <Projeto>.Domain.Entities
{
    public class ProductEntity
    {
        public int             Id        { get; set; }
        public Guid            Uuid      { get; set; }
        public string          Code      { get; set; }
        public string          Name      { get; set; }
        public decimal         Price     { get; set; }
        public DateTimeOffset  CreatedAt { get; set; }
        public DateTimeOffset  UpdatedAt { get; set; }
        public bool            Deleted   { get; set; }
    }
}
```

---

## Anti-padrões — O que NÃO fazer

| ❌ Errado | ✅ Correto |
|---|---|
| Tabela sem `Uuid` | Toda tabela tem `Id` + `Uuid` |
| `DELETE FROM` físico | `UPDATE ... SET Deleted = 1` |
| Expor `Id` numérico na API | Expor `Uuid` na API |
| `CreatedAt` sem `DEFAULT (getutcdate())` | Sempre definir o default no banco |
| `DateTime` na Entity para coluna `DATETIMEOFFSET` | Usar `DateTimeOffset` na Entity |
| SELECT sem filtro `Deleted = 0` | Sempre filtrar `AND Deleted = 0` |
| Remover coluna obrigatória (`Id`, `Uuid`, `CreatedAt`, `UpdatedAt`, `Deleted`) | Todas as colunas obrigatórias devem existir |

---

## Checklist para criar uma nova tabela

```
[ ] Definir nome da tabela em PascalCase (ex: ProductCategory)
[ ] Id          → INT IDENTITY(1,1) NOT NULL, PRIMARY KEY CLUSTERED
[ ] Uuid        → UNIQUEIDENTIFIER DEFAULT (newid()) NOT NULL
[ ] Colunas da entidade (sem as de auditoria)
[ ] CreatedAt   → DATETIMEOFFSET(7) DEFAULT (getutcdate()) NULL
[ ] UpdatedAt   → DATETIMEOFFSET(7) DEFAULT (getutcdate()) NULL
[ ] Deleted     → BIT DEFAULT ((0)) NULL
[ ] Entity .NET com Guid para Uuid e DateTimeOffset para CreatedAt/UpdatedAt
[ ] Todos os SELECTs do repositório filtram AND Deleted = 0
[ ] DeleteAsync usa UPDATE SET Deleted = 1 (nunca DELETE FROM)
```
