# UnitOfWork

## UnitOfWork

### Interface (Domain)

Cada banco de dados tem seu próprio `IUnitOfWork<X>` que herda `IUnitOfWork`.
As propriedades expõem os repositórios como **getters** que retornam `new Repository(this)`.

```csharp
// <Projeto>.Domain/UnitOfWorks/IUnitOfWorkApp.cs
namespace <Projeto>.Domain.UnitOfWorks
{
    public interface IUnitOfWorkApp : IUnitOfWork
    {
        IProductRepository Product { get; }
        IOrderRepository   Order   { get; }
        // ... demais repositórios
    }
}
```

```csharp
// <Projeto>.Domain/UnitOfWorks/IUnitOfWork.cs  (base — não alterar)
namespace <Projeto>.Domain.UnitOfWorks
{
    public interface IUnitOfWork : IDisposable
    {
        void BeginTransaction();
        void Commit();
        void Rollback();
    }
}
```

### Implementação (Infrastructure)

Herda de `UnitOfWork<TDbConnection>` (genérico que gerencia connection/transaction).
Cada repositório é instanciado via expression-body `=> new Repository(this)`.

```csharp
// <Projeto>.Infrastructure/UnitOfWorks/UnitOfWorkApp.cs
using Microsoft.Data.SqlClient;      // ou OracleConnection etc.
using Microsoft.Extensions.Configuration;
using <Projeto>.Domain.UnitOfWorks;
using <Projeto>.Infrastructure.Repositories;

namespace <Projeto>.Infrastructure.UnitOfWorks
{
    public class UnitOfWorkApp : UnitOfWork<SqlConnection>, IUnitOfWorkApp
    {
        public IProductRepository Product => new ProductRepository(this);
        public IOrderRepository   Order   => new OrderRepository(this);

        public UnitOfWorkApp(IConfiguration configuration)
        {
            ConnectionString = configuration.GetConnectionString("AppDb");
        }
    }
}
```

O registro de UnitOfWork no DI está em [dependency-injection.md](dependency-injection.md).
