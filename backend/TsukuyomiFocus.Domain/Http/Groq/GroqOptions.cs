namespace TsukuyomiFocus.Domain.Http.Groq;

public sealed class GroqOptions
{
    public const string SectionName = "GroqSettings";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1/chat/completions";
    public string TextModel { get; set; } = "llama-3.3-70b-versatile";
    public string VisionModel { get; set; } = "meta-llama/llama-4-scout-17b-16e-instruct";
}
