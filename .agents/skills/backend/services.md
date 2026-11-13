# Serviços

## Serviços (Application)

### Interface

```csharp
// <Projeto>.Application/Interfaces/Product/IProductService.cs
using GrupoMadero.Common.Results;
using <Projeto>.Application.Models;

namespace <Projeto>.Application.Interfaces.Product
{
    public interface IProductService
    {
        Task<Result<ProductModel>>              GetByIdAsync(int id);
        Task<Result<IEnumerable<ProductModel>>> GetAllAsync();
        Task<Result<int>>                       CreateAsync(ProductModel model);
        Task<Result<bool>>                      UpdateAsync(ProductModel model);
    }
}
```

### Implementação

- Injeta `IUnitOfWork<X>` (interface, não a implementação concreta).
- Injeta `ILogger<TService>` para logging estruturado.
- Retorna `Result<T>` (nunca lança exceções para controle de fluxo).
- Catch genérico loga com `_logger.LogError(ex, "mensagem")`.
- Chama os mappers `.ToModel()` / `.ToEntity()` de `Application/Mappers/` explicitamente; veja [mappers.md](mappers.md).

```csharp
// <Projeto>.Application/Services/Product/ProductService.cs
using GrupoMadero.Common.Results;
using Microsoft.Extensions.Logging;
using <Projeto>.Application.Helpers;
using <Projeto>.Application.Interfaces.Product;
using <Projeto>.Application.Mappers;
using <Projeto>.Application.Models;
using <Projeto>.Domain.UnitOfWorks;

namespace <Projeto>.Application.Services.Product
{
    public class ProductService : IProductService
    {
        private readonly IUnitOfWorkApp _unitOfWork;
        private readonly ILogger<ProductService> _logger;

        public ProductService(IUnitOfWorkApp unitOfWork, ILogger<ProductService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger     = logger;
        }

        public async Task<Result<ProductModel>> GetByIdAsync(int id)
        {
            try
            {
                var entity = await _unitOfWork.Product.GetByIdAsync(id);
                if (entity == default)
                    return ErrorMessages.EntityNotFound;

                return entity.ToModel();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching product by id {Id}.", id);
                return ErrorMessages.UnknownError;
            }
        }

        public async Task<Result<IEnumerable<ProductModel>>> GetAllAsync()
        {
            try
            {
                var entities = await _unitOfWork.Product.GetAllAsync();
                return entities.ToModel().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all products.");
                return ErrorMessages.UnknownError;
            }
        }

        public async Task<Result<int>> CreateAsync(ProductModel model)
        {
            try
            {
                var entity = model.ToEntity();
                var id = await _unitOfWork.Product.CreateAsync(entity);
                return id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product.");
                return ErrorMessages.UnknownError;
            }
        }

        public async Task<Result<bool>> UpdateAsync(ProductModel model)
        {
            try
            {
                var entity = model.ToEntity();
                entity.Id = model.Id;
                var success = await _unitOfWork.Product.UpdateAsync(entity);
                if (!success)
                    return ErrorMessages.EntityNotFound;

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product with Id {Id}.", model.Id);
                return ErrorMessages.UnknownError;
            }
        }
    }
}
```

---
