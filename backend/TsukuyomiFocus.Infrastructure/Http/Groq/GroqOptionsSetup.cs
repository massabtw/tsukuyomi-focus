using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TsukuyomiFocus.Domain.Http.Groq;

namespace TsukuyomiFocus.Infrastructure.Http.Groq;

internal sealed class GroqOptionsSetup : IConfigureOptions<GroqOptions>
{
    private const string DefaultBaseUrl = "https://api.groq.com/openai/v1/chat/completions";
    private const string DefaultTextModel = "llama-3.3-70b-versatile";
    private const string DefaultVisionModel = "llama-3.2-90b-vision-preview";

    private readonly IConfiguration _configuration;

    public GroqOptionsSetup(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void Configure(GroqOptions options)
    {
        _configuration.GetSection(GroqOptions.SectionName).Bind(options);

        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            options.ApiKey = _configuration["GROQ_API_KEY"]
                ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")
                ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            options.BaseUrl = DefaultBaseUrl;
        }

        if (string.IsNullOrWhiteSpace(options.TextModel))
        {
            options.TextModel = DefaultTextModel;
        }

        if (string.IsNullOrWhiteSpace(options.VisionModel))
        {
            options.VisionModel = DefaultVisionModel;
        }
    }
}
