using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using TsukuyomiFocus.Domain.Http.Groq;

namespace TsukuyomiFocus.Infrastructure.Http.Groq;

internal sealed class GroqAuthHandler : DelegatingHandler
{
    private readonly GroqOptions _options;

    public GroqAuthHandler(IOptions<GroqOptions> options)
    {
        _options = options.Value;
    }

    protected override HttpResponseMessage Send(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        ApplyBearerToken(request);
        return base.Send(request, cancellationToken);
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        ApplyBearerToken(request);
        return await base.SendAsync(request, cancellationToken);
    }

    private void ApplyBearerToken(HttpRequestMessage request)
    {
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey.Trim());
        }
    }
}
