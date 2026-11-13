# Controllers e REST

## Controllers

Controllers são **magros**: apenas recebem a requisição, chamam o serviço e retornam o resultado.
- Injetar serviços via `[FromServices]` no parâmetro do action method.
- Retornar usando os métodos de extensão do `Result<T>`: `.Ok()`, `.Created()`, `.NoContent()`.
- Sempre crie rotas no padrão RESTful.

```csharp
// <Projeto>.Api/Controllers/ProductController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using <Projeto>.Api.Extensions;
using <Projeto>.Application.Interfaces.Product;
using <Projeto>.Application.Models;

namespace <Projeto>.Api.Controllers
{
    [Route("api")]
    [ApiController]
    [Authorize]
    public class ProductController : ControllerBase
    {
        [HttpGet("Product/{id}")]
        public async Task<IActionResult> GetById(
            [FromServices] IProductService service,
            int id)
        {
            var result = await service.GetByIdAsync(id);
            return result.Ok();
        }

        [HttpGet("Product")]
        public async Task<IActionResult> GetAll(
            [FromServices] IProductService service)
        {
            var result = await service.GetAllAsync();
            return result.Ok();
        }

        [HttpPost("Product")]
        public async Task<IActionResult> Create(
            [FromServices] IProductService service,
            [FromBody] ProductModel model)
        {
            var result = await service.CreateAsync(model);
            return result.Created();
        }

        [HttpPut("Product")]
        public async Task<IActionResult> Update(
            [FromServices] IProductService service,
            [FromBody] ProductModel model)
        {
            var result = await service.UpdateAsync(model);
            return result.NoContent();
        }
    }
}
```

---
