using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TsukuyomiFocus.Domain.Http.Groq;

namespace TsukuyomiFocus.Infrastructure.Http.Groq;

internal sealed class GroqOptionsSetup : IConfigureOptions<GroqOptions>
{
    private const string DefaultBaseUrl = "https://api.groq.com/openai/v1/chat/completions";
    private const string DefaultTextModel = "openai/gpt-oss-120b";
    private const string DefaultVisionModel = "qwen/qwen3.8-27b";
    private const string DeprecatedTextModel = "llama-3.3-70b-versatile";
    private const string DeprecatedVisionModel = "llama-3.2-90b-vision-preview";
    private const string UnavailableVisionModel = "meta-llama/llama-4-scout-17b-16e-instruct";

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

        if (string.IsNullOrWhiteSpace(options.TextModel) ||
            string.Equals(options.TextModel.Trim(), DeprecatedTextModel, StringComparison.OrdinalIgnoreCase))
        {
            options.TextModel = DefaultTextModel;
        }

        if (string.IsNullOrWhiteSpace(options.VisionModel) ||
            string.Equals(options.VisionModel.Trim(), DeprecatedVisionModel, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(options.VisionModel.Trim(), UnavailableVisionModel, StringComparison.OrdinalIgnoreCase))
        {
            options.VisionModel = DefaultVisionModel;
        }
    }
}
