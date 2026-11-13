# Integrações Externas — HTTP

## Quando usar esta skill

- Criando um cliente HTTP para um sistema externo (Protheus, ERP, APIs de terceiros)
- Adicionando autenticação em chamadas HTTP (Basic Auth, Bearer, etc.)
- Registrando `HttpClient` com `DelegatingHandler` no DI

> **Seções neste arquivo:** [1. Interface](#1-interface-domain) · [2. Models](#2-models-de-requestresponse-domain) · [3. Options](#3-options-domain) · [4. Implementação](#4-implementação-infrastructure) · [5. Handler](#5-delegatinghandler-de-autenticação-infrastructure) · [6. DI](#6-registro-no-di-infrastructureioccs)

---

## Estrutura de camadas

```
Domain/
└── Http/
    └── <Sistema>/
        ├── I<Sistema>Service.cs      → interface do cliente HTTP
        ├── <Sistema>Options.cs       → configurações (URL, credenciais)
        └── Models/
            └── <Sistema>XModel.cs   → modelos de resposta da API externa

Infrastructure/
└── Http/
    └── <Sistema>/
        ├── <Sistema>Service.cs       → implementação com HttpClient
        └── <Sistema>AuthHandler.cs  → DelegatingHandler de autenticação
```

---

## 1. Interface (Domain)

A interface fica em `Domain/Http/<Sistema>/`. Retorna Models do namespace `Domain.Http.<Sistema>.Models` — **nunca** Models da camada Application para serviços externos.

```csharp
// <Projeto>.Domain/Http/Protheus/IProtheusService.cs
namespace <Projeto>.Domain.Http.Protheus
{
    public interface IProtheusService
    {
        Task<List<ProtheusBranchModel>> GetAllBranchesAsync();
    }
}
```

---

## 2. Models de request/response (Domain)

Todos os contratos da API externa ficam em `Domain/Http/<Sistema>/Models/`, em arquivos
próprios, com sufixo `Model`. São POCOs simples, sem anotações de ORM. Atributos de
serialização como `[JsonPropertyName]` são permitidos quando necessários para o contrato JSON.

Isso inclui requests, responses, envelopes, listas de resultados, erros e objetos aninhados
do JSON, mesmo quando usados somente dentro da implementação e não retornados pela interface.
Não declarar esses contratos na Application ou Infrastructure, nem como tipos `private` ou
`internal` aninhados dentro da Service. A regra vale para classes, records e structs.

Por exemplo, uma integração com Google Maps deve colocar `GoogleMapsApiResponseModel`,
`GoogleMapsResultModel`, `GoogleMapsGeometryModel` e `GoogleMapsLocationModel` em arquivos
próprios no Domain. Ter apenas `GoogleMapsGeocodingModel` no Domain não basta se os tipos
desserializados ainda estiverem dentro de `GoogleMapsService` na Infrastructure.

```csharp
// <Projeto>.Domain/Http/Protheus/Models/ProtheusBranchModel.cs
namespace <Projeto>.Domain.Http.Protheus.Models
{
    public class ProtheusBranchModel
    {
        public string Code           { get; set; }
        public string Name           { get; set; }
        public string Cnpj           { get; set; }
        public string State          { get; set; }
        public bool   CalculatesMrp  { get; set; }
    }
}
```

---

## 3. Options (Domain)

Ficam **na mesma pasta da interface**, em `Domain/Http/<Sistema>/`. Lidas do `appsettings.json` via `ConfigureOptions<TOptions>` no IoC da Infrastructure.

```csharp
// <Projeto>.Domain/Http/Protheus/ProtheusOptions.cs
namespace <Projeto>.Domain.Http.Protheus
{
    public class ProtheusOptions
    {
        public string BaseUrl  { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
    }
}
```

---

## 4. Implementação (Infrastructure)

Fica em `Infrastructure/Http/<Sistema>/`. Recebe `HttpClient` e `IOptions<TOptions>` no construtor.

```csharp
// <Projeto>.Infrastructure/Http/Protheus/ProtheusService.cs
using <Projeto>.Domain.Http.Protheus;
using <Projeto>.Domain.Http.Protheus.Models;
using Microsoft.Extensions.Options;

namespace <Projeto>.Infrastructure.Http.Protheus
{
    public class ProtheusService : IProtheusService
    {
        private readonly HttpClient _httpClient;
        private readonly ProtheusOptions    _options;

        public ProtheusService(HttpClient httpClient, IOptions<ProtheusOptions> options)
        {
            _httpClient = httpClient;
            _options           = options.Value;
        }

        public async Task<List<ProtheusBranchModel>> GetAllBranchesAsync()
        {
            var uri = $"{_options.BaseUrl}/api/Branch";
            return await _httpClient.GetFromJsonAsync<List<ProtheusBranchModel>>(uri);
        }
    }
}
```

---

## 5. DelegatingHandler de autenticação (Infrastructure)

O handler é `internal` e fica na mesma pasta da implementação. Sobrescreve `Send` e `SendAsync` para injetar os headers em toda requisição.

Exemplo com **Basic Auth**:

```csharp
// <Projeto>.Infrastructure/Http/Protheus/ProtheusAuthHandler.cs
using <Projeto>.Domain.Http.Protheus;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;

namespace <Projeto>.Infrastructure.Http.Protheus
{
    internal class ProtheusAuthHandler : DelegatingHandler
    {
        private readonly ProtheusOptions _options;

        public ProtheusAuthHandler(IOptions<ProtheusOptions> options)
        {
            _options = options.Value;
        }

        protected override HttpResponseMessage Send(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", GetAuthenticationString());
            return base.Send(request, cancellationToken);
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", GetAuthenticationString());
            return await base.SendAsync(request, cancellationToken);
        }

        private string GetAuthenticationString()
        {
            var raw   = $"{_options.Username}:{_options.Password}";
            var bytes = Encoding.ASCII.GetBytes(raw);
            return Convert.ToBase64String(bytes);
        }
    }
}
```

---

## 6. Registro no DI (Infrastructure/IoC.cs)

Ordem obrigatória: **options → handler → HttpClient**. O nome do client é sempre `nameof(I<Sistema>Service)`.

```csharp
// <Projeto>.Infrastructure/IoC.cs
private static void AddProtheus(this IServiceCollection services, IConfiguration configuration)
{
    services.ConfigureOptions<ProtheusOptions>(configuration);

    services.AddTransient<ProtheusAuthHandler>();

    services.AddHttpClient<IProtheusService, ProtheusService>()
            .AddHttpMessageHandler<ProtheusAuthHandler>();
}
```

> Chamar `AddProtheus` dentro do método principal de extensão da Infrastructure (`AddInfrastructure` ou equivalente).

---

## Regras obrigatórias

- A **interface** e as **Options** ficam sempre no **Domain** (`Domain/Http/<Sistema>/`).
- **Todos os contratos de request/response**, inclusive tipos auxiliares de desserialização,
  ficam no **Domain** (`Domain/Http/<Sistema>/Models/`) — nunca na Application ou Infrastructure.
- Cada contrato fica em um arquivo próprio, com sufixo `Model`. Não aninhar classes, records
  ou structs de contratos dentro da Service, independentemente da visibilidade.
- A **implementação** e o **handler** ficam sempre na **Infrastructure** (`Infrastructure/Http/<Sistema>/`).
- O handler é sempre `internal`.
- Options são registradas via `ConfigureOptions<TOptions>`, **não** `Configure<TOptions>`.
- O handler é registrado como `AddTransient` antes de ser passado ao `AddHttpMessageHandler`.

---

## Anti-padrões — O que NÃO fazer

| ❌ Errado | ✅ Correto |
|---|---|
| Interface do cliente HTTP na Application | Interface no Domain (`Domain/Http/<Sistema>/`) |
| Models da API externa na Application ou Infrastructure | Models no Domain (`Domain/Http/<Sistema>/Models/`) |
| `private class GoogleMapsApiResponse` dentro de `GoogleMapsService` | `GoogleMapsApiResponseModel.cs` no Domain, usado pela Service |
| Somente o Model retornado pela interface no Domain | Todos os contratos JSON no Domain, incluindo envelopes e objetos internos |
| Options na Application ou Infrastructure | Options no Domain, junto da interface |
| Handler `public` | Handler `internal` |
| `new HttpClient()` na implementação | Injetar `HttpClient` ou `IHttpClientFactory` e usar `CreateClient(...)` |
| Magic string no nome do client | Usar `nameof(I<Sistema>Service)` |
| Registrar handler como `AddSingleton` | Registrar handler como `AddTransient` |

---

## Checklist para nova integração externa

```
[ ] Domain/Http/<Sistema>/I<Sistema>Service.cs             → interface com os métodos
[ ] Domain/Http/<Sistema>/<Sistema>Options.cs              → URL, credenciais, etc.
[ ] Domain/Http/<Sistema>/Models/<Sistema>XModel.cs        → modelos de resposta (se houver)
[ ] Todos os contratos JSON em arquivos próprios no Domain, inclusive requests, envelopes e objetos aninhados
[ ] Nenhuma classe/record/struct de contrato externo na Infrastructure, inclusive dentro da Service
[ ] Infrastructure/Http/<Sistema>/<Sistema>Service.cs      → implementação com IHttpClientFactory ou HttpClient injetado
[ ] Infrastructure/Http/<Sistema>/<Sistema>AuthHandler.cs  → DelegatingHandler (internal)
[ ] Infrastructure/IoC.cs → ConfigureOptions + AddTransient<Handler> + AddHttpClient + AddHttpMessageHandler
```

Antes de concluir, revise o diff com este checklist e corrija as violações identificadas.
