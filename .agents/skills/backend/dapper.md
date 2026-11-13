# Repositórios e Dapper

## Repositórios

### Interface (Domain)

```csharp
// <Projeto>.Domain/Repositories/IProductRepository.cs
namespace <Projeto>.Domain.Repositories
{
    public interface IProductRepository
    {
        Task<ProductEntity>              GetByIdAsync(int id);
        Task<IEnumerable<ProductEntity>> GetAllAsync();
        Task<int>  CreateAsync(ProductEntity entity);
        Task<bool> UpdateAsync(ProductEntity entity);
        Task<bool> DeleteAsync(int id);
    }
}
```

### Implementação com Dapper (Infrastructure)

- Recebe `UnitOfWork<TDbConnection>` (concreto) no construtor.
- Usa `_unitOfWork.Connection` e `_unitOfWork.Transaction` em todos os métodos.
- SQL é sempre `const string sql = @"..."` ou `var sql = @$"..."` (interpolado se dinâmico).
- Parâmetros via objetos anônimos: `new { id }` ou `new { entity.Name, ... }`.

```csharp
// <Projeto>.Infrastructure/Repositories/ProductRepository.cs
using Dapper;
using <Projeto>.Domain.Entities;
using <Projeto>.Domain.Repositories;
using <Projeto>.Infrastructure.UnitOfWorks;

namespace <Projeto>.Infrastructure.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly UnitOfWorkApp _unitOfWork;

        public ProductRepository(UnitOfWorkApp unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<ProductEntity> GetByIdAsync(int id)
        {
            const string sql = @"
                SELECT Id, Code, Name, Price, CreatedAt, UpdatedAt
                  FROM Product
                 WHERE Id = @id
                   AND Deleted = 0";

            return await _unitOfWork.Connection
                .QueryFirstOrDefaultAsync<ProductEntity>(sql, new { id },
                    transaction: _unitOfWork.Transaction);
        }

        public async Task<IEnumerable<ProductEntity>> GetAllAsync()
        {
            const string sql = @"
                SELECT Id, Code, Name, Price, CreatedAt, UpdatedAt
                  FROM Product
                 WHERE Deleted = 0";

            return await _unitOfWork.Connection
                .QueryAsync<ProductEntity>(sql,
                    transaction: _unitOfWork.Transaction);
        }

        public async Task<int> CreateAsync(ProductEntity entity)
        {
            const string sql = @"
                INSERT INTO Product (Code, Name, Price)
                OUTPUT Inserted.Id
                VALUES (@Code, @Name, @Price)";

            return await _unitOfWork.Connection
                .ExecuteScalarAsync<int>(sql,
                    new { entity.Code, entity.Name, entity.Price },
                    _unitOfWork.Transaction);
        }

        public async Task<bool> UpdateAsync(ProductEntity entity)
        {
            const string sql = @"
                UPDATE Product
                   SET Name      = @Name,
                       Price     = @Price,
                       UpdatedAt = @UpdatedAt
                 WHERE Id = @Id AND Deleted = 0";

            var rows = await _unitOfWork.Connection
                .ExecuteAsync(sql,
                    new { entity.Id, entity.Name, entity.Price, UpdatedAt = DateTime.UtcNow },
                    transaction: _unitOfWork.Transaction);

            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            const string sql = @"
                UPDATE Product SET Deleted = 1, UpdatedAt = @UpdatedAt
                 WHERE Id = @id AND Deleted = 0";

            var rows = await _unitOfWork.Connection
                .ExecuteAsync(sql,
                    new { id, UpdatedAt = DateTime.UtcNow },
                    transaction: _unitOfWork.Transaction);

            return rows > 0;
        }
    }
}
```

#### Dapper — Boas práticas

| Situação | Método Dapper |
|---|---|
| Retorna coleção | `QueryAsync<T>` |
| Retorna um item (nullable) | `QueryFirstOrDefaultAsync<T>` |
| INSERT com OUTPUT | `ExecuteScalarAsync<int>` |
| UPDATE / DELETE | `ExecuteAsync` → checar `rows > 0` |
| Multi-mapping (JOIN) | `QueryAsync<T1,T2,T>(split, map)` |
| Lista em IN clause | Passar `IEnumerable` direto no parâmetro |
| String ANSI (SQL Server) | `SqlMapper.AddTypeMap(typeof(string), DbType.AnsiString)` no IoC |

---
