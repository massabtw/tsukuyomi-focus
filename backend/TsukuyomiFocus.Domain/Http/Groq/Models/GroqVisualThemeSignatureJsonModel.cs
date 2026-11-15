using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqVisualThemeSignatureJsonModel
{
    [JsonPropertyName("primaryGlowColor")]
    public string? PrimaryGlowColor { get; set; }

    [JsonPropertyName("secondaryColor")]
    public string? SecondaryColor { get; set; }

    [JsonPropertyName("audioPitchRate")]
    public double? AudioPitchRate { get; set; }
}
