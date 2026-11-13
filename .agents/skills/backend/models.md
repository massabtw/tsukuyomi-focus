# Models e Entities

## Contratos de APIs externas

Models de request/response de sistemas externos ficam em `Domain/Http/<Sistema>/Models/`,
em arquivos próprios, inclusive envelopes e objetos aninhados usados apenas na desserialização.
Não declarar esses contratos na Application ou Infrastructure, nem como tipos privados de
uma Service. Consulte [external-integrations.md](external-integrations.md) ao alterar integrações HTTP.

## Models (nunca DTOs)

Todos os objetos de entrada/saída da camada Application são chamados **Model** (sufixo `Model`).
**Nunca usar** o termo DTO neste projeto.
Sempre crie models em inglês, atendendo o padrão RESTful, no formato de classes POCO.

```csharp
// <Projeto>.Application/Models/ProductModel.cs
namespace <Projeto>.Application.Models
{
    public class ProductModel
    {
        public int     Id    { get; set; }
        public string  Code  { get; set; }
        public string  Name  { get; set; }
        public decimal Price { get; set; }
    }
}
```

Models de request também seguem o mesmo padrão:

```csharp
// <Projeto>.Application/Models/ProductQueryModel.cs
namespace <Projeto>.Application.Models
{
    public class ProductQueryModel
    {
        public int?    Id   { get; set; }
        public string? Code { get; set; }
    }
}
```

---

## Entities (Domain)

Entidades ficam em `<Projeto>.Domain/Entities/`. Sem anotações de ORM — Dapper faz mapeamento por nome de coluna/propriedade.

```csharp
// <Projeto>.Domain/Entities/ProductEntity.cs
namespace <Projeto>.Domain.Entities
{
    public class ProductEntity
    {
        public int            Id        { get; set; }
        public Guid           Uuid      { get; set; }
        public string         Code      { get; set; }
        public string         Name      { get; set; }
        public decimal        Price     { get; set; }
        public bool           Deleted   { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
```

> **Atenção:** `Uuid` é `Guid` (mapeia para `UNIQUEIDENTIFIER`). `CreatedAt` e `UpdatedAt` são `DateTimeOffset` (mapeia para `DATETIMEOFFSET`). Consulte [database.md](database.md) para o padrão completo de tabelas.

---
