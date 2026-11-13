# Dependency Injection

## Registro de Serviços no DI

### Regra geral

| Tipo | Registro |
|---|---|
| Serviços da Application | `AddTransient<IService, Service>()` |
| UnitOfWork | `AddTransient<IUnitOfWork, UnitOfWork>()` |
| Factories | `AddTransient<IFactory, Factory>()` |
| HttpClient com handler | `AddHttpClient<IService, Service>().AddHttpMessageHandler<Handler>()` |

### Application/IoC.cs — Padrão de adição

```csharp
private static void AddApplicationServices(this IServiceCollection services)
{
    // Product services
    services.AddTransient<IProductService, ProductService>();

    // Order services
    services.AddTransient<IOrderGetService,    OrderGetService>();
    services.AddTransient<IOrderPostService,   OrderPostService>();
    services.AddTransient<IOrderCancelService, OrderCancelService>();

    // ... demais serviços
}
```

**Nunca usar** `AddScoped` ou `AddSingleton` para serviços de negócio.

---

### Registro no DI (Infrastructure/IoC.cs)

UnitOfWork é sempre **Transient**:

```csharp
private static void AddUnitOfWork(this IServiceCollection services)
{
    services.AddTransient<IUnitOfWorkApp, UnitOfWorkApp>();
    // adicionar demais UnitOfWorks conforme o projeto
}
```

---
