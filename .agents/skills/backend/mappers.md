# Mappers

## Mappers

Toda conversão entre objetos da camada **Domain** e objetos da camada **Application** deve ser realizada através de **mappers dedicados**.

Os mappers devem:

- ficar exclusivamente em `<Projeto>.Application/Mappers/`;
- ser criados em **arquivos separados das Services**;
- ser classes `static`;
- utilizar métodos de extensão;
- utilizar preferencialmente os métodos `ToModel()` e `ToEntity()`;
- realizar o mapeamento de forma manual e explícita;
- não possuir dependências injetadas;
- não acessar banco de dados, serviços externos ou `IUnitOfWork`;
- não conter lógica de negócio;
- não utilizar AutoMapper.

### Regra obrigatória

**Nunca mapear Entity → Model ou Model → Entity diretamente dentro de uma Service.**

A Service deve apenas obter o objeto da camada inferior e chamar o mapper correspondente.

❌ **Não fazer:**

```csharp
public async Task<Result<ProductModel>> GetByIdAsync(
    int id,
    CancellationToken cancellationToken = default)
{
    var entity = await unitOfWork.Product.GetByIdAsync(id, cancellationToken);

    if (entity is null)
        return ProductErrors.NotFound;

    return new ProductModel
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        Price = entity.Price
    };
}
```

Também não realizar o mapeamento manual dentro de um `Select`:

```csharp
var entities = await unitOfWork.Product.GetAllAsync(cancellationToken);

return entities
    .Select(entity => new ProductModel
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        Price = entity.Price
    })
    .ToList();
```

✅ **Fazer:**

```csharp
var entity = await unitOfWork.Product.GetByIdAsync(id, cancellationToken);

if (entity is null)
    return ProductErrors.NotFound;

return entity.ToModel();
```

Para coleções:

```csharp
var entities = await unitOfWork.Product.GetAllAsync(cancellationToken);

return entities
    .Select(entity => entity.ToModel())
    .ToList();
```

O `Select` na Service é permitido **somente para invocar um mapper já existente**.

A definição das propriedades convertidas deve permanecer no arquivo de mapper.

---

### Localização e nomenclatura

Cada mapper deve possuir seu próprio arquivo dentro da camada Application.

Estrutura esperada:

```text
<Projeto>.Application/
├── Mappers/
│   ├── ProductModelMap.cs
│   ├── OrderModelMap.cs
│   └── BranchModelMap.cs
├── Models/
├── Services/
└── Interfaces/
```

Exemplo:

```text
<Projeto>.Application/Mappers/ProductModelMap.cs
```

Nome preferencial:

```csharp
ProductModelMap
```

Para uma entidade `ProductEntity` e um model `ProductModel`.

Não declarar o mapper:

- dentro da classe da Service;
- como método privado da Service;
- dentro do Controller;
- dentro do Repository;
- dentro da própria Entity ou Model.

---

### Entity → Model

```csharp
// <Projeto>.Application/Mappers/ProductModelMap.cs

using <Projeto>.Application.Models;
using <Projeto>.Domain.Entities;

namespace <Projeto>.Application.Mappers;

public static class ProductModelMap
{
    public static ProductModel ToModel(this ProductEntity entity)
    {
        return new ProductModel
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Price = entity.Price
        };
    }
}
```

Uso na Service:

```csharp
using <Projeto>.Application.Mappers;

public async Task<Result<ProductModel>> GetByIdAsync(
    int id,
    CancellationToken cancellationToken = default)
{
    try
    {
        var entity = await unitOfWork.Product.GetByIdAsync(id, cancellationToken);

        if (entity is null)
            return ProductErrors.NotFound;

        return entity.ToModel();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching product {ProductId}.", id);
        return ErrorMessages.UnknownError;
    }
}
```

---

### Collections

Não é obrigatório criar um mapper específico para coleções quando o mapeamento individual já existe.

Preferir reaproveitar o `ToModel()` existente:

```csharp
var entities = await unitOfWork.Product.GetAllAsync(cancellationToken);

return entities
    .Select(entity => entity.ToModel())
    .ToList();
```

Também é permitido criar uma extensão para coleção quando isso reduzir repetição relevante:

```csharp
public static IReadOnlyList<ProductModel> ToModel(
    this IEnumerable<ProductEntity> entities)
{
    return entities
        .Select(entity => entity.ToModel())
        .ToList();
}
```

Permitindo:

```csharp
var entities = await unitOfWork.Product.GetAllAsync(cancellationToken);

return entities.ToModel();
```

Independentemente da abordagem escolhida, a Service **não deve conhecer quais propriedades precisam ser copiadas**.

---

### Model → Entity

Quando uma operação de criação ou atualização recebe um Model da Application e precisa produzir uma Entity do Domain, utilizar `ToEntity()`.

```csharp
public static ProductEntity ToEntity(this ProductModel model)
{
    return new ProductEntity
    {
        Id = model.Id,
        Code = model.Code,
        Name = model.Name,
        Price = model.Price
    };
}
```

Uso:

```csharp
public async Task<Result<int>> CreateAsync(
    ProductModel model,
    CancellationToken cancellationToken = default)
{
    try
    {
        var entity = model.ToEntity();

        var id = await unitOfWork.Product.CreateAsync(
            entity,
            cancellationToken);

        return id;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error creating product.");
        return ErrorMessages.UnknownError;
    }
}
```

---

### Models diferentes para leitura e escrita

Quando a feature possuir Models diferentes para leitura, criação ou atualização, cada conversão deve continuar centralizada no mapper.

Exemplo:

```csharp
public static ProductModel ToModel(this ProductEntity entity)
{
    return new ProductModel
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        Price = entity.Price
    };
}

public static ProductEntity ToEntity(this ProductWriteModel model)
{
    return new ProductEntity
    {
        Code = model.Code,
        Name = model.Name,
        Price = model.Price
    };
}
```

Service:

```csharp
var entity = model.ToEntity();

var id = await unitOfWork.Product.CreateAsync(
    entity,
    cancellationToken);
```

---

### Mapeamento de objetos relacionados

Caso uma Entity possua objetos relacionados, preferir reutilizar os mappers desses objetos em vez de repetir o mapeamento.

Exemplo:

```csharp
public static OrderModel ToModel(this OrderEntity entity)
{
    return new OrderModel
    {
        Id = entity.Id,
        Number = entity.Number,
        Customer = entity.Customer?.ToModel(),
        Products = entity.Products?
            .Select(product => product.ToModel())
            .ToList()
            ?? []
    };
}
```

Evitar:

```csharp
Customer = new CustomerModel
{
    Id = entity.Customer.Id,
    Name = entity.Customer.Name
}
```

se já existir:

```csharp
entity.Customer.ToModel()
```

Isso mantém a definição de conversão de cada objeto em um único lugar.

---

### Nullability

Quando a origem puder ser `null`, o mapper pode possuir uma sobrecarga nullable quando isso melhorar a legibilidade:

```csharp
public static ProductModel? ToModel(this ProductEntity? entity)
{
    if (entity is null)
        return null;

    return new ProductModel
    {
        Id = entity.Id,
        Code = entity.Code,
        Name = entity.Name,
        Price = entity.Price
    };
}
```

Entretanto, quando a ausência da Entity representa uma regra funcional, como `NotFound`, a validação deve continuar na Service:

```csharp
var entity = await unitOfWork.Product.GetByIdAsync(id, cancellationToken);

if (entity is null)
    return ProductErrors.NotFound;

return entity.ToModel();
```

O mapper não deve decidir regras de negócio.

---

### Responsabilidade do Mapper

Mapper é responsável somente por **transformação estrutural de dados**.

Pode:

```csharp
Name = entity.Name,
CreatedAt = entity.CreatedAt,
Status = entity.Status.ToString()
```

Pode realizar conversões simples necessárias para representar o dado:

```csharp
FullName = $"{entity.FirstName} {entity.LastName}"
```

quando isso fizer parte exclusivamente da representação do Model.

Não deve:

```csharp
if (entity.Status == ...)
    // executar regra de negócio

await repository.GetAsync(...);

await service.GetAsync(...);

unitOfWork.Commit();
```

Se uma transformação depende de banco de dados, integração externa ou decisão funcional, ela não pertence ao mapper.

---

### Regra para geração de código pela IA

Ao implementar ou refatorar uma feature:

1. Identifique se existe conversão entre `Entity` e `Model`.
2. Procure primeiro por um mapper existente em `Application/Mappers`.
3. Caso exista, reutilize-o.
4. Caso não exista, crie um novo arquivo de mapper.
5. Coloque toda a definição das propriedades convertidas nesse arquivo.
6. Importe `<Projeto>.Application.Mappers` na Service.
7. Na Service, apenas invoque `.ToModel()` ou `.ToEntity()`.
8. Não crie métodos privados de mapeamento dentro da Service.
9. Não crie `new XModel { ... }` na Service para converter uma Entity.
10. Não duplique mapeamentos que já estejam definidos em outro mapper.

Exemplo da separação esperada:

```text
Application/
├── Mappers/
│   └── BranchModelMap.cs
├── Models/
│   └── BranchModel.cs
└── Services/
    └── Branch/
        └── BranchService.cs
```

`BranchModelMap.cs`:

```csharp
public static class BranchModelMap
{
    public static BranchModel ToModel(this BranchEntity entity)
    {
        return new BranchModel
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name
        };
    }
}
```

`BranchService.cs`:

```csharp
var branches = await unitOfWork.Branch.GetAllAsync(cancellationToken);

return branches
    .Select(branch => branch.ToModel())
    .ToList();
```

A Service deve conhecer **quando** realizar o mapeamento.

O Mapper deve conhecer **como** realizar o mapeamento.

---
