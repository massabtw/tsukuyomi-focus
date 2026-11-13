# Validações

## Validações (FluentValidation)

```csharp
// <Projeto>.Application/Validations/ProductModelValidator.cs
using FluentValidation;
using <Projeto>.Application.Models;

namespace <Projeto>.Application.Validations
{
    public class ProductModelValidator : AbstractValidator<ProductModel>
    {
        public ProductModelValidator()
        {
            RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Price).GreaterThan(0);
        }
    }
}
```

Registro automático em `Application/IoC.cs`:

```csharp
private static void AddValidators(this IServiceCollection services)
{
    ValidatorOptions.Global.LanguageManager.Culture = new CultureInfo("pt-BR");
    services.AddValidatorsFromAssembly(typeof(IoC).Assembly);
}
```

---
