using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqSharinganJsonModel
{
    [JsonPropertyName("doujutsuName")]
    public string? DoujutsuName { get; set; }

    [JsonPropertyName("loreDescription")]
    public string? LoreDescription { get; set; }

    [JsonPropertyName("primaryGlowColor")]
    public string? PrimaryGlowColor { get; set; }

    [JsonPropertyName("imageGenerationPrompt")]
    public string? ImageGenerationPrompt { get; set; }

    [JsonPropertyName("svgCode")]
    public string? SvgCode { get; set; }
}
